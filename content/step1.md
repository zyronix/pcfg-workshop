# Step 1: PCFG basics

**Goal:** see how passwords become a grammar, and crack a password that was never in the training set.

## 1. Train

The training set is ten passwords built from Dutch cities: [step1.txt](files/step1.txt).

```
amsterdam2024
rotterdam2024
Amsterdam1
groningen!
utrecht2024
haarlem123
leiden1
Leiden2024
delft123
maastricht!
```

Train a ruleset called `step1` on it:

```
python3 trainer.py -t step1.txt -r step1 -c 1.0 -e utf-8
```

The trainer writes the ruleset to `Rules/step1`.

 - The `-t` or `--training` tells `trainer.py` which file to be used for training. 
 - `-r` or `--rule` tells the name of the ruleset to be created. It will be created in the folder to `./Rules/` relative to trainer.py
 - `-c` or `--coverage` tells the trainer how much PCFG should spend on OMEN. For this workshop we are skipping OMEN completly. 
 - `-e` or `--encoding` just makes our live easier to tell the trainer that we'll have a utf-8 file. If you dont specify this option, it will try to guess the encoding.

## 2. Read the Rules

PCFG splits every password into **grammars** (what the password looks like) and **terminals** (what is filled in). Open the grammars:

```
cat Rules/step1/Grammar/grammar.txt
```

Each line is a grammar and its probability. In the grammar `A5D3`, `A5` represents `Alpha` of the length of `5`. Other letters are: `D` == `Digits` and `O` == `Other` aka specials like `!@#$%^&*`. 

PCFG also has special letters in its grammar. Like `K` standing for keyboard walks.

```question
id: s1-years
ask: The letter Y is also possible in a grammar, what does the Y stand for?
answer: year
answer: years
hint: Check the Rules/step1 folder and search for an entry that starts with the `Y`
```

```question
id: s1-structure
ask: Convert `amsterdam2024` to a grammar, what will be the grammar?
answer: A9Y1
hint: Count the letters of `amsterdam`, then check how the trainer recorded `2024`.
explain: Nine letters, then one year. For a year, the number is how many years there are, not how many digits.
```

```question
id: s1-why-02
ask: Why does the grammar of amsterdam2024 has a probability of 0.2, while all other structures have 0.1?
- [ ] Words with nine letters are more common in Dutch
- [x] Two of the ten training passwords have this structure
- [ ] I have no idea
- [ ] The trainer rounds probabilities up for long passwords
explain: `amsterdam2024` and `rotterdam2024` both have the structure `A9Y1`, so it gets 2 out of 10.
```

## 3. Read the terminals

The values that fill a structure live in a file per type and length:

```
cat Rules/step1/Alpha/9.txt
cat Rules/step1/Capitalization/9.txt
cat Rules/step1/Years/1.txt
```

```question
id: s1-amsterdam-prob
ask: What probability does `amsterdam` have in `Alpha/9.txt`?
answer: 0.5
answer: 0,5
hint: Count how many training passwords contain a nine-letter word, and how many of those are amsterdam.
explain: Four training passwords contain a nine-letter word, and two of them are `amsterdam` (one of them is `Amsterdam1`).
```

```question
id: s1-capital
ask: The training set contains `Amsterdam1` with a capital A, but `Alpha/9.txt` only has `amsterdam` in lowercase. How is the capital stored?
- [ ] It is not stored, PCFG ignores case
- [ ] As a separate word `Amsterdam` in `Alpha/9.txt`
- [x] As the mask `ULLLLLLLL` in `Capitalization/9.txt`
- [ ] As an `O` structure for the uppercase character
explain: Words are always stored in lowercase. A separate capitalization mask says which letters become upper case, so every nine-letter word can get a capital, not only amsterdam.
```

## 4. PCFG queue
The idea behind PCFG is that it is probabilistic. Meaning that the first candidate is the most probable, the second candidate is the second most probable.

The probability of a candidate is the probability of its structure multiplied by the probability of each terminal. For example, `amsterdam2024`:

```
P(A9Y1) x P(amsterdam) x P(LLLLLLLLL) x P(2024)
  0.2   x     0.5      x     0.75     x   1.0     = 0.075
```

To determine what the next candidate is, PCFG uses a deadbeat dad algorithm to determine the next candidate. It keeps a **priority queue**, a list that is always sorted with the most probable item on top, and repeats three steps:

1. **Take** the top item off the queue and print its candidates.
2. **Make its children.** For each slot, swap the terminal for the next one in its file, one slot at a time. A child is always less probable than its parent.
3. **Push** each child onto the queue, but only if this parent is responsible for it. That rule is the *deadbeat dad* rule. Sorry I didn't make up that name.

Two things to know before we start:

- **Terminals with the same probability form one group.** `utrecht` and `haarlem` both have 0.5 in `Alpha/7.txt`, so they are one entry. One queue item can therefore print several candidates.
- **A queue item is a grammar plus, for each slot, which group fills it.** We write it as `amsterdam | LLLLLLLLL | 2024`.

**Start.** The queue starts empty. For each of the 9 grammars, the guesser adds one item filled with the most probable terminals:

| Probability | Grammar | Item | Prints | |
|---|---|---|---|---|
| 0.1 | `A5D3` | `delft \| LLLLL \| 123` | `delft123` |  |
| 0.1 | `A10O1` | `maastricht \| LLLLLLLLLL \| !` | `maastricht!` |  |
| 0.075 | `A9Y1` | `amsterdam \| LLLLLLLLL \| 2024` | `amsterdam2024` |  |
| 0.05 | `A6D1` | `leiden \| LLLLLL or ULLLLL \| 1` | `leiden1`, `Leiden1` |  |
| 0.05 | `A6Y1` | `leiden \| LLLLLL or ULLLLL \| 2024` | `leiden2024`, `Leiden2024` |  |
| 0.05 | `A7D3` | `utrecht or haarlem \| LLLLLLL \| 123` | `utrecht123`, `haarlem123` |  |
| 0.05 | `A7Y1` | `utrecht or haarlem \| LLLLLLL \| 2024` | `utrecht2024`, `haarlem2024` |  |
| 0.0375 | `A9O1` | `amsterdam \| LLLLLLLLL \| !` | `amsterdam!` |  |
| 0.0375 | `A9D1` | `amsterdam \| LLLLLLLLL \| 1` | `amsterdam1` |  |

**Take:** `delft123` (0.1). Every slot has only one terminal (`Alpha/5.txt` holds only `delft`), so there is no next terminal to swap in. No children.

Queue after take 1:

| Probability | Grammar | Item | Prints | |
|---|---|---|---|---|
| 0.1 | `A10O1` | `maastricht \| LLLLLLLLLL \| !` | `maastricht!` |  |
| 0.075 | `A9Y1` | `amsterdam \| LLLLLLLLL \| 2024` | `amsterdam2024` |  |
| 0.05 | `A6D1` | `leiden \| LLLLLL or ULLLLL \| 1` | `leiden1`, `Leiden1` |  |
| 0.05 | `A6Y1` | `leiden \| LLLLLL or ULLLLL \| 2024` | `leiden2024`, `Leiden2024` |  |
| 0.05 | `A7D3` | `utrecht or haarlem \| LLLLLLL \| 123` | `utrecht123`, `haarlem123` |  |
| 0.05 | `A7Y1` | `utrecht or haarlem \| LLLLLLL \| 2024` | `utrecht2024`, `haarlem2024` |  |
| 0.0375 | `A9O1` | `amsterdam \| LLLLLLLLL \| !` | `amsterdam!` |  |
| 0.0375 | `A9D1` | `amsterdam \| LLLLLLLLL \| 1` | `amsterdam1` |  |

**Take:** `maastricht!` (0.1). Same as before: no terminals left.

Current queue:

| Probability | Grammar | Item | Prints | |
|---|---|---|---|---|
| 0.075 | `A9Y1` | `amsterdam \| LLLLLLLLL \| 2024` | `amsterdam2024` |  |
| 0.05 | `A6D1` | `leiden \| LLLLLL or ULLLLL \| 1` | `leiden1`, `Leiden1` |  |
| 0.05 | `A6Y1` | `leiden \| LLLLLL or ULLLLL \| 2024` | `leiden2024`, `Leiden2024` |  |
| 0.05 | `A7D3` | `utrecht or haarlem \| LLLLLLL \| 123` | `utrecht123`, `haarlem123` |  |
| 0.05 | `A7Y1` | `utrecht or haarlem \| LLLLLLL \| 2024` | `utrecht2024`, `haarlem2024` |  |
| 0.0375 | `A9O1` | `amsterdam \| LLLLLLLLL \| !` | `amsterdam!` |  |
| 0.0375 | `A9D1` | `amsterdam \| LLLLLLLLL \| 1` | `amsterdam1` |  |

**Take:** `amsterdam2024` (0.075). Now there are children, one per slot:

- `A9`: `amsterdam` → `rotterdam or groningen` gives 0.2 × 0.25 × 0.75 × 1 = 0.0375. **Push to the queue**
- `C9`: `LLLLLLLLL` → `ULLLLLLLL` gives 0.2 × 0.5 × 0.25 × 1 = 0.025. **Push to the queue.**
- `Y1`: only `2024` exists, so no child.

Current queue:

| Probability | Grammar | Item | Prints | |
|---|---|---|---|---|
| 0.05 | `A6D1` | `leiden \| LLLLLL or ULLLLL \| 1` | `leiden1`, `Leiden1` |  |
| 0.05 | `A6Y1` | `leiden \| LLLLLL or ULLLLL \| 2024` | `leiden2024`, `Leiden2024` |  |
| 0.05 | `A7D3` | `utrecht or haarlem \| LLLLLLL \| 123` | `utrecht123`, `haarlem123` |  |
| 0.05 | `A7Y1` | `utrecht or haarlem \| LLLLLLL \| 2024` | `utrecht2024`, `haarlem2024` |  |
| 0.0375 | `A9Y1` | `rotterdam or groningen \| LLLLLLLLL \| 2024` | `rotterdam2024`, `groningen2024` | new |
| 0.0375 | `A9O1` | `amsterdam \| LLLLLLLLL \| !` | `amsterdam!` |  |
| 0.0375 | `A9D1` | `amsterdam \| LLLLLLLLL \| 1` | `amsterdam1` |  |
| 0.025 | `A9Y1` | `amsterdam \| ULLLLLLLL \| 2024` | `Amsterdam2024` | new |

**Take:** `leiden1`, `Leiden1` (0.05).

Current queue:

| Probability | Grammar | Item | Prints | |
|---|---|---|---|---|
| 0.05 | `A6Y1` | `leiden \| LLLLLL or ULLLLL \| 2024` | `leiden2024`, `Leiden2024` |  |
| 0.05 | `A7D3` | `utrecht or haarlem \| LLLLLLL \| 123` | `utrecht123`, `haarlem123` |  |
| 0.05 | `A7Y1` | `utrecht or haarlem \| LLLLLLL \| 2024` | `utrecht2024`, `haarlem2024` |  |
| 0.0375 | `A9Y1` | `rotterdam or groningen \| LLLLLLLLL \| 2024` | `rotterdam2024`, `groningen2024` |  |
| 0.0375 | `A9O1` | `amsterdam \| LLLLLLLLL \| !` | `amsterdam!` |  |
| 0.0375 | `A9D1` | `amsterdam \| LLLLLLLLL \| 1` | `amsterdam1` |  |
| 0.025 | `A9Y1` | `amsterdam \| ULLLLLLLL \| 2024` | `Amsterdam2024` |  |

This process repeats itself untill all items have been processed.

```question
id: s1-deadbeat
ask: What is the probability of `Groningen!`?
answer: 0.00625
answer: 0,00625
explain: P(A9O1) x P(groningen) x P(ULLLLLLLL) x P(!) = 0.1 x 0.25 x 0.25 x 1.0 = 0.00625
hint: Look up the probability of A9O1 in grammar.txt, groningen in Alpha/9.txt, ULLLLLLLL in Capitalization/9.txt and ! in Other/1.txt. Multiply them all. Or if you just want to continue. The answer is 0.00625
```

## 5. Generating candidates

Now let PCFG generate guesses, most likely first:

```
python3 pcfg_guesser.py -r step1
```

```question
id: s1-count
ask: How many candidates does the guesser generate in total?
answer: 28
hint: Count the non-empty lines: `python3 pcfg_guesser.py -r step1 2>/dev/null | grep -c .` (the guesser starts with an empty line, so `wc -l` is one too high).
explain: 10 training passwords give 28 candidates. It created new combination that were not in your trainingset.
```

```question
id: s1-new
ask: How many of those candidates were **not** in the training set?
answer: 18
hint: Total candidates minus the training passwords.
explain: 28 - 10 = 18. These are new combinations of structures and terminals that PCFG learned separately.
```

## 6. Crack

Here is an MD5 hash: [step1.hash](files/step1.hash)

```
d474224973e2eb5d8aee73b5f63a3d52
```

Send the PCFG guesses into Hashcat:

```
python3 pcfg_guesser.py -r step1 | ../hashcat/hashcat -m 0 step1.hash
```

When it is cracked, show the password with `--show`:

```
../hashcat/hashcat -m 0 step1.hash --show
```

```question
id: s1-crack
ask: What is the password?
sha256: 7903147d3ed1a749e37e16a699c042d00c9bebfa3b9fbc75a3ab2d5cca491988
case: exact
hint: Did you run `--show`? Enter the password exactly as Hashcat prints it.
```

```question
id: s1-password
ask: What makes this password special?
- [ ] Groningen is a great place
- [ ] It is in lower case, even though more passwords are uppercase
- [ ] You cannot crack this password with hashcat
- [x] The password was not in the original trainingset, it is a new combination created.
explain: This combination was not in the original training set. You could have created such password easily with a custom rule file and a wordlist with hashcat. With PCFG, if you have enough and good password data this is done automatically for you by PCFG.
```

> **Done early?** Add a password of your own to `step1.txt`, train a new ruleset, and predict which structures and probabilities change before you look.
