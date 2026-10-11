# Stage 3: Hashcat PCFG

**Goal:** use pcfg_cracker rulesets in Hashcat, merge rulesets in Hashcat, and attack with a hint file.

Hashcat has its own PCFG implementation, `-a 4`. You still train with pcfg_cracker.

- **The order is approximate.** Hashcat rounds every probability to a whole number of steps. So the order is not in a true propabilistic order. Plus there is a little overhead of duplicate candidates (5%).
- **In return, the keyspace is fixed.** Hashcat can compute which candidate is at any position, so `--skip`, `--restore` and splitting the work over many machines (for example with Hashtopolis) all work.
- **It is fast.** On a fast hash like MD5, the GPU expands the candidates itself, so there is no pipe from a Python process in the way.

## 1. Same ruleset, different order

Let Hashcat print the candidates of your stage 1 ruleset:

```
../hashcat/hashcat -a 4 --stdout Rules/Stage1
```

Compare them with `python3 pcfg_guesser.py -r Stage1`.

```question
id: s3-count
ask: How many candidates does Hashcat print for `Rules/Stage1`?
answer: 28
hint: Add `| wc -l`.
explain: The same 28 candidates as pcfg_guesser. Only the order differs.
```

```question
id: s3-first
ask: Which candidate does Hashcat print first?
answer: amsterdam2024
case: exact
hint: Add `| head -1`.
explain: pcfg_guesser starts with `delft123` (probability 0.1). Hashcat puts `amsterdam2024` (0.075) first, because rounding can swap candidates whose probabilities are close.
```

## 2. Merge in Hashcat

Your new target is **Emma Bakker**:

| Info | Value |
|---|---|
| Cat | Pippa |
| Son | Luuk, born 2017 |
| Club | Ajax |
| Hobbies | Hockey, Zeilen |
| Born | 1992 |
| Married | 2021 |

You get two pretrained rulesets: a general one and one trained on Emma's facts. Hashcat merges rulesets when you name more than one:

Create `emma.txt` with the following rules:

- one fact per line
- Casing doesn't matter
- from the dates, keep only the year

```
python3 trainer.py -t emma.txt -r Emma -c 1.0 -e utf-8
```

Now inspect the output:

```
../hashcat/hashcat -m 0 -a 4 --stdout Rules/General Rules/Emma weights=1:9 --limit 10
```

`weights=1:9` gives Emma's ruleset 90% of the weight, like `-w 0.9` in stage 2.

```question
id: s3-merge
ask: How is Hashcat's merge different from `merge_rules.py --merge_base_only`?
- [ ] Hashcat only merges the words
- [x] Hashcat merges every file, including the grammar
- [ ] Hashcat runs the two rulesets one after the other
explain: Hashcat takes the weighted average of every file, so Emma's bare-word grammar is mixed in too. There is no base-only option, so the target usually needs more guesses than with a base-only merge.
```

Emma's password

```
2b8cb7f967fed83961a6d2a793093e77
```

Pippa123Hockey!2017

Let's try to crack it:

```
../hashcat/hashcat -m 0 -a 4 step3.hash Rules/General Rules/Emma weights=1:9
```

## 3. Hint file

So what if you want the PCFG to **only** generate candidates based on the personal information you got from the target? This is what `hints` can be used for. It is similar to the `replace-alphas` in the merge_pcfg.

But tools/pcfg_hints.py replaces every alpha with one length-independent hint token. It sums the probabilities of structures that collapse together (For example just the grammar `H1` is the sum of the probability of A1...An)

```
python3 ../hashcat/tools/pcfg_hints.py Rules/General Rules/General_Hints
head -10 Rules/General_Hints/Grammar/grammar.txt
```

```question
id: s3-collapse
ask: What has happend to the A6 grammar that was the first grammar in the General ruleset?
- [ ] Compeletly gone
- [x] It is part of the `H1 probability
explain: pcfg_hints.py sums the probabilities of structures that collapse together (For example just the grammar `H1` is the sum of the probability of the grammars `A1...An`)
```

Inspect the output:

```
../hashcat/hashcat -a 4 Rules/General_Hints hintfile=emma.txt --stdout --limit 100
```

Now start cracking with it:

```
../hashcat/hashcat -m 0 step3.hash -a 4 Rules/General_Hints hintfile=emma.txt
../hashcat/hashcat -m 0 step3.hash --show

```

Hashcat combines every word with the structures people use: word plus digits, two words joined, word plus year plus symbol. The most likely come first, and you don't need to train or merge anything.

```question
id: s3-crack
ask: What is Emma's password?
sha256: 5c2e86b22e7ec82627f5c5d8a8f8959745a598d06f0c910a8c4415c07fcdaed0
case: exact
hint: Use `--show` and enter the password exactly as printed.
```
