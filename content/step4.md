# Step 4: Hashtopolis PCFG

**Goal:** run the hint attack from step 3 as a distributed task in Hashtopolis.

In step 3 you learned that with Hashcat, you can distribute PCFG on Hashtopolis.

> **Agent fix required.** The Hashtopolis Python agent needs [hashtopolis/agent-python#79](https://github.com/hashtopolis/agent-python/pull/79) for PCFG. Without it, the agent does not rewrite the file path in `hintfile=emma.txt`, because it only rewrites arguments separated by spaces. The workshop platform runs a patched agent. To use this in production, you need to deploy the hashtopolis-agent 

## 0. The workshop platform

For the workshop there is a shared Hashtopolis platform. **Ask the tutor for the URL and your credentials.**

Because everybody uses the same platform, give everything you create a **unique identifier**, for example your initials: `rvd`. In the steps below, replace `<id>` with yours. This applies to the files, the hashlist and the task, so you can find your own and don't overwrite someone else's.

## 1. Compress the ruleset

Hashcat can read a PCFG ruleset as a directory, but also as one compressed `.tar.xz` file, and the attack is the same either way. You cannot distribute directories using Hashtopolis, so we'll be creating a archive. Compress the `General_Hints` ruleset from step 3:

```
tar cfJ <id>_General_Hints.tar.xz -C Rules/General_Hints .
ls -lh <id>_General_Hints.tar.xz
```

`-C Rules/General_Hints .` puts the files of the ruleset at the top of the archive, which is where Hashcat looks for them.

Try your new archive, that it works the same way as the Rule directory: 

```
../hashcat/hashcat -a 4 --stdout --limit 10 <id>_General_Hints.tar.xz hintfile=emma.txt
```

Give the hint file your identifier too:

```
cp emma.txt <id>_emma.txt
```

```question
id: s4-files
ask: How many files does Hashtopolis have to distribute to the agents for this attack (not counting the hashlist)?
answer: 2
answer: two
hint: The ruleset and ...
explain: The compressed ruleset and the hint file. Each agent downloads both before it starts its first chunk.
```

## 2. Create a hashlist

In Hashtopolis, create a new hashlist:

| Field | Value |
|---|---|
| Name | `<id>_emma` |
| Hash type | `0` (MD5) |
| Hashes | `2b8cb7f967fed83961a6d2a793093e77` |

This is the same hash as Emma's password in step 3.

## 3. Upload the files

Upload both files under **Files**:

- `<id>_General_Hints.tar.xz`
- `<id>_emma.txt`

## 4. Create the task

Create a new task:

| Field | Value |
|---|---|
| Name | `<id>_emma_pcfg` |
| Hashlist | `<id>_emma` |
| Attack command | `#HL# -a 4 <id>_General_Hints.tar.xz hintfile=<id>_emma.txt` |
| Files | attach `<id>_General_Hints.tar.xz` and `<id>_emma.txt` |
| Priority | >1 |

- `#HL#` is replaced by the agent with the path of the hashlist.
- **Every file named in the attack command has to be attached to the task, or the agent will not download it.**

```question
id: s4-attach
ask: Your task starts, but the agent reports that it cannot find `<id>_emma.txt`. What is the most likely cause?
- [ ] The hint file has to be compressed as well
- [x] The file is not attached to the task
- [ ] Hashtopolis does not support `-a 4`
- [ ] The hashlist has the wrong hash type
explain: The agent only downloads the files that are attached to the task. A file named in the attack command but not attached never reaches the agent.
```

## 5. Watch it crack

Open your task. Hashtopolis cuts the keyspace into chunks and hands them to the agents. It should be cracked after roughly 2-3 chunks (5-10 minutes).

```question
id: s4-crack
ask: What is Emma's password, as Hashtopolis shows it?
sha256: 5c2e86b22e7ec82627f5c5d8a8f8959745a598d06f0c910a8c4415c07fcdaed0
case: exact
hint: Open your hashlist and look at the cracked hashes.
explain: The same password as in step 3, now found by an agent working through its chunk of the keyspace.
```
