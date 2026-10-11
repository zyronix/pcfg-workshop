# Step 2: Targetted PCFG with merging

With a general ruleset like you created in step 1. You can more efficiently crack password then just with a dictionary and hashcat rules. You can also created a targetted ruleset. You might have some personal information of you suspect and want to convert that information into real passwords.

The general flow for this:

1. first to create a ruleset trained on leak passwords. With this you'll make PCFG learn that what structures people commonly use. 
2. Next you train another ruleset on the personal information, then you'll merge that information with the generic ruleset to convert this into real password.

To make this more concreate, you know that someone lives in amsterdam, amsterdam by itself might not be a password; you want to convert it into amsterdam1996 for example. You learn the structure 'L9Y1' from the generic leak password dataset and amsterdam and 1996 from the personal information.

In other words: A general ruleset knows **how** people build passwords. It doesn't know **what** this person puts in them. This process is called **merging** rulesets.

## 1. Train a general ruleset

We'll be learning the structure of passwords from the very famous rockyou leak. We have take the first 1mil passwords from this list just to speed up the training process.

Generally speaking Rockyou might not be the best in real password cracking. The passwords in this leak are generally very weak. Best to select a leak with passwords that are generally close to the structure what you are expecting for your target.

[rockyou-1m.txt](files/rockyou-1m.txt) Source [Weakpass](https://weakpass.com/wordlists/rockyou.txt#download)

```
python3 trainer.py -t rockyou-1m.txt -r General -c 1.0 -e utf-8
```

## 2. Build a training file from the target's profile

Your target is **Johan de Vries**. This is what you know about him:

| Info | Value |
|---|---|
| Partner | Sanne |
| Son | Milan, born 03-09-2015 |
| Dog | Bobby |
| Football club | Feyenoord |
| Hobbies | Korfbal, Duiken |
| Birthday | 12-05-1987 |
| Wedding | 14-02-2019 |

Create `johan.txt` with the following rules:

- one fact per line
- Casing doesn't matter
- from the dates, keep only the year

```question
id: s2-lines
ask: How many lines does your `johan.txt` have?
answer: 9
hint: Six words and three years.
explain: sanne, milan, bobby, feyenoord, korfbal, duiken, 1987, 2015 and 2019.
```

> **Stuck?** Download the finished file: [johan.txt](files/johan.txt).

## 3. Train the targeted ruleset

```
python3 trainer.py -t johan.txt -r Johan -c 1.0 -e utf-8
```

Now let use this ruleset to generate candidates:
```
python3 pcfg_guesser.py -r Johan
```

```question
id: s2-grammar
ask: Can you use the ruleset `Johan` directly for password cracking?
- [ ] Yes! The passwords like perfect!
- [x] No, it just prints the personal information as-is, these aren't really passwords yet
```

## 4. Merge only the terminals

Merge `Johan` into `General` and keep the structures of `General`:

```
python3 ../pcfg-tools/merge_rules.py -r General -i Johan -o General_Johan -w 0.9 --merge_base_only -D ./Rules
python3 ../pcfg-tools/merge_rules.py --help
```

```question
id: s2-base-only
ask: Why do we use `--merge_base_only`?
- [ ] It makes the merge run faster
- [x] Johan's grammar (bare words, bare years) are not real password structures, so you don't want to use them.
- [ ] Without it, the merge loses the years
- [ ] The general ruleset has no capitalization
explain: Without it, "a bare five-letter word" and "a bare year" would take a large share of the grammar. The capitalization that the general dataset would have, would also be lost.
```

Look at what happened to the five-letter words and the years:

```
head -5 Rules/General_Johan/Alpha/5.txt
head -5 Rules/General_Johan/Years/1.txt
```

```question
id: s2-weight
ask: What does `-w 0.9` do?
- [x] The terminals of `Johan` get 90% of the weight when merging with the general ruleset.
- [ ] 90% of the guesses come from `Johan` and 10% from `General`
- [ ] Only the top 90% of Johan's words are used
explain: Each probability becomes 0.9 x Johan + 0.1 x General. That puts Johan's words and years at the top of their lists.
```

This whole concept of merging is based on ["Using Personal Information in Targeted Grammar-Based Probabilistic Password Attacks"](https://inria.hal.science/hal-01716395/document) by Shiva Houshmand and Sudhir Aggarwal.

## 5. Crack

Johan's password: [step2.hash](files/step2.hash)

```
8bb7948578eb5e857dabf5dfc1b2e010
```

```
python3 pcfg_guesser.py -r General_Johan 2>/dev/null | ../hashcat/hashcat -m 0 step2.hash
../hashcat/hashcat -m 0 step2.hash --show
```

```question
id: s2-crack
ask: What is Johan's password?
sha256: 8f74fbcad02c06db6fa163aeba0ee0e05b68904c8e0c505166d75e65815a1466
case: exact
hint: Enter the password exactly as `--show` prints it.
explain: The club and a year from his profile, in a structure gotten from Rockyou.
```

> **Done early?** Merge again without `--merge_base_only` (as `Johan_Full`) and compare the first 20 guesses of both rulesets. Then try `-w 0.5`.
