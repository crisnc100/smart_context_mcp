# Smart Context MCP: a retrospective

> **Status: archived.** This project is no longer maintained, and I don't recommend using it.
> This README looks back at what I built, what I found when I tested it again a year later,
> and why the idea stopped making sense. The original README is
> [preserved here](https://github.com/crisnc100/smart_context_mcp/blob/98c8e7124098aeee4b25bad341cb3677b3443302/README.md).

## What it was

An MCP server I built in the summer of 2025 (v1.0 in July, v2.0 in September), published to npm
as `@crisnc100/smart-context-mcp`.

The idea: before a coding agent starts a task, it asks the server which files matter. The server
would read the task, decide what kind of task it was (debugging, a new feature, a refactor), score
every file in the project, and return the best ones within a token budget, with a confidence score
and a reason for each. It was supposed to get better over time by learning which files actually
helped, and to use git history to find files that usually change together. Version 2.0 went further
and tried to assemble a whole "context package": code snippets, import relationships and suggested
fixes.

Around 5,000 lines of JavaScript, 12 MCP tools and a SQLite database.

## Why I built it

In mid-2025 I kept watching agents spend their context on the wrong files, reading things that
didn't matter and missing the one that did. My bet was that a dedicated server could pick the right
files up front and save the model the trouble.

## What I found when I came back (November 2026)

A little over a year later I tested it properly: a current MCP client, real code, including this
repo itself. Short version: it didn't work, and in some ways it never had.

- **The latest version doesn't start.** My final "clean up" commit moved two files into `archive/`
  that the server still imports, so `node src/index.js` crashes immediately. The npm release was
  published the day before that commit.
- **The main tool returns nothing.** With those two files put back, the server connects fine, but
  `get_optimal_context` returned zero files for every task I tried: on this repo, on its own test
  fixture, and even when the task named the file. A filter dropped any file scoring below 0.6, and
  without a "current file" the scoring formula could barely get past 0.35. The 2.0 changelog says I
  fixed empty results. I hadn't.
- **The git analysis never ran.** Co-change detection passed `--oneline` to the `simple-git`
  library, which breaks its log parser. Every commit lookup failed, the errors were swallowed, and
  the database never received any data. A one-line `awk` script over `git log` finds the pairs it
  was looking for.
- **"Semantic understanding" was a list of regexes.** Eight keyword buckets. Any task containing
  "bug" became the concept *error*, and any task mentioning "token" became *authentication*.
- **The other tools gave wrong answers.** Asked about a git bug, `generate_context_package` returned
  a React error-boundary snippet from a test script. `smart_grep` built a pattern that plain `grep`
  reads as one literal string, so it matched nothing, and it added login and auth patterns to a
  question that had nothing to do with either.
- **The tests couldn't catch any of this.** They printed output but checked nothing, and the default
  `npm test` hangs partway through.
- **The numbers in the old README weren't measurements.** "85%+ relevance" was a target from my own
  roadmap. The only accuracy test I ran was 14 queries against a 5-file mock project, and 6 of the
  14 found all the right files.

The pattern behind most of this: I was adding features faster than I was checking that the core
worked, and the tests I wrote couldn't fail.

## Why the idea itself got overtaken

Even a bug-free version would be hard to justify now. Between 2025 and 2026, coding harnesses
(Claude Code, Codex, Cursor and others) and the models behind them changed what "context
management" means.

- **Agents search for themselves, and they're good at it.** Instead of being handed files, the model
  greps, globs and reads in a loop, following leads as it learns more. Claude Code's team has said
  they tried a local vector index early on and found this kind of agentic search worked better. A
  server that guesses the right files *before* the work starts is competing with a model that looks
  *while* it works, and a wrong guess up front costs more than a few extra searches.
- **The harness owns the context window.** It decides when to summarize, when to hand work to a
  subagent, which tools to load and what to remember between sessions. It sees the whole
  conversation; an outside server sees one tool call. And the harness keeps improving at all of it.
- **Better models make the guess less valuable.** With larger context windows and stronger
  reasoning, reading an extra file is cheap and recovering from a wrong one is easy. The cost this
  server was trying to save got smaller with every model release.
- **Learning needs a signal.** The learning loop depended on the model calling
  `record_session_outcome` after each task to report which files helped. Nothing triggered that
  automatically, so there was never going to be much data to learn from.
- **Tools cost context too.** The 12 tool definitions add up to about 1,500 tokens in every session,
  used or not. That's small, but it's 12 overlapping options for the model to choose between, for a
  job it already does on its own.

## What I'd do differently

1. **Measure first.** Build an evaluation with real assertions before building features. One honest
   benchmark would have shown me that the main tool returned nothing.
2. **Don't compete with the harness on thinking.** If a model with a shell can do it in a few
   commands, it isn't a good MCP server. It might be a skill, a hook or a small CLI instead.
3. **Build what a smarter model can't do for itself.** MCP servers earn their place by giving the
   model *access* (data or systems it can't otherwise reach), *actions* (doing real things safely,
   with permissions and a record of what happened) or *shared state* (information that outlives one
   session or is shared between people). Better models make those more valuable, not less.
4. **Fewer, sharper tools.** Two or three tools shaped around real tasks beat twelve that overlap.
5. **Run it after the cleanup.** The commit that tidied the project is the one that broke it.

## What's next

I'm taking these lessons into my next project, and I'll link it here when it's up.

## If you still want to look at the code

The code is left as it was at v2.0.0, for reference. To run it, copy
`archive/old-versions/contextAnalyzer-pure.js` and `archive/old-versions/fileScanner-optimized.js`
back into `src/`, then `npm install` and `node src/index.js`. Expect the problems described above.
The dependencies also have open security advisories (`npm audit` reports eight, one of them
critical), so don't point it at anything you care about.

## License

MIT
