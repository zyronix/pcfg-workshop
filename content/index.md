# PCFG Workshop

With this workshop you will start to learn how to use PCFG. The focus is on the PCFG cracker created by Matt Weir ([pcfg_cracker](https://github.com/lakiw/pcfg_cracker)). The workshop was created with AI, but every text and command has been verified, or rewritten by a human.

The workshop consists of 3 excercises. 

| Step | You will |
|---|---|
| [1. PCFG basics](step1.md) | Train on a small set of passwords, understand what grammars and terminals are. And run your first PCFG attack! |
| [2. Targeted cracking](step2.md) | Create a targetted ruleset by integrating personal information into your rulesets. |
| [3. Hashcat PCFG](step3.md) | Learn how to use the rulefiles in Hashcat and what hint files are. |
| [4. Hashtopolis PCFG](step4.md) | Learn how to use Hashcat' PCFG with Hashtopolis |

Got stuck? The next step will provide the files that you should have created at the previous step.

## Your environment

Setup:

```
sudo apt update
sudo apt install git -y
sudo apt install build-essential
git clone https://github.com/NetherlandsForensicInstitute/pcfg-tools
git clone https://github.com/lakiw/pcfg_cracker
git clone https://github.com/hashcat/hashcat
cd hashcat
make
```

Run every command from the pcfg_cracker directory unless the instructions say otherwise:

```
cd ..
cd pcfg_cracker
```

## Answering questions

Each step has questions. Type your answer and press **Check**. Everything runs locally in your browser.

```question
id: welcome-ready
ask: Ready? What does PCFG stand for? Click check, without an answer or a wrong answer to get a hint:
answer: probabilistic context-free grammar
answer: probabilistic context free grammar
answer: pretty cool fuzzy guesser
hint: Visit https://github.com/lakiw/pcfg_cracker, either cammelcase or all lower.
```
