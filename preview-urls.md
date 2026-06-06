# Online Experiment Preview URLs

## Local server

From the repository root:

```powershell
python -m http.server 8123
```

If `python` is not on PATH:

```powershell
C:\Users\tkhsf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m http.server 8123
```

Base URL:

- [http://127.0.0.1:8123/online-experiment/index.html](http://127.0.0.1:8123/online-experiment/index.html)

## Normal flow

The normal participant flow is:

1. `intro`
2. `consent`
3. `pre-SD`
4. `selection`
5. `pre-matching`
6. `writing`
7. `post-matching`
8. `post-SD`
9. `save`
10. `finish`

In a normal run, the experiment uses DataPipe condition assignment unless `useConditionAssignment` is disabled in `config/experiment.js`.

## Preview URLs

- Intro
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=intro](http://127.0.0.1:8123/online-experiment/index.html?preview=intro)
- Consent
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=consent](http://127.0.0.1:8123/online-experiment/index.html?preview=consent)
- Pre-SD
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=pre-sd](http://127.0.0.1:8123/online-experiment/index.html?preview=pre-sd)
- Pre-matching
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=pre-matching](http://127.0.0.1:8123/online-experiment/index.html?preview=pre-matching)
- Writing
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=writing](http://127.0.0.1:8123/online-experiment/index.html?preview=writing)
- Post-matching
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=post-matching](http://127.0.0.1:8123/online-experiment/index.html?preview=post-matching)
- Post-SD
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=post-sd](http://127.0.0.1:8123/online-experiment/index.html?preview=post-sd)
- Finish
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=finish](http://127.0.0.1:8123/online-experiment/index.html?preview=finish)

Preview matching uses target-only plans so that each matching preview stays small and deterministic.

## Condition and participant overrides

- `condition=<condition_id>` is intended for preview and manual checks.
- Supported condition ids:
  - `counter_attitudinal`
  - `objective_description_control`
  - `irrelevant_control`
- Example:
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=irrelevant_control](http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=irrelevant_control)

## Writing preview by condition

- `counter_attitudinal`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=counter_attitudinal](http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=counter_attitudinal)
- `objective_description_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=objective_description_control](http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=objective_description_control)
- `irrelevant_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=irrelevant_control](http://127.0.0.1:8123/online-experiment/index.html?preview=writing&condition=irrelevant_control)

## Consent preview by condition

- `counter_attitudinal`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=counter_attitudinal](http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=counter_attitudinal)
- `objective_description_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=objective_description_control](http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=objective_description_control)
- `irrelevant_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=irrelevant_control](http://127.0.0.1:8123/online-experiment/index.html?preview=consent&condition=irrelevant_control)

## Full run by condition

- `counter_attitudinal`
  - [http://127.0.0.1:8123/online-experiment/index.html?condition=counter_attitudinal&save=download](http://127.0.0.1:8123/online-experiment/index.html?condition=counter_attitudinal&save=download)
- `objective_description_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?condition=objective_description_control&save=download](http://127.0.0.1:8123/online-experiment/index.html?condition=objective_description_control&save=download)
- `irrelevant_control`
  - [http://127.0.0.1:8123/online-experiment/index.html?condition=irrelevant_control&save=download](http://127.0.0.1:8123/online-experiment/index.html?condition=irrelevant_control&save=download)

- `participant_id=<id>` forces a participant id for local checks.
- Example:
  - [http://127.0.0.1:8123/online-experiment/index.html?participant_id=test001](http://127.0.0.1:8123/online-experiment/index.html?participant_id=test001)

## Download mode

Use `save=download` to skip DataPipe/OSF and download the CSV locally:

- [http://127.0.0.1:8123/online-experiment/index.html?participant_id=download-check&save=download](http://127.0.0.1:8123/online-experiment/index.html?participant_id=download-check&save=download)

Expected result:

- the browser downloads one CSV file
- the finish page shows `Downloaded CSV (...)`
- the CSV includes `pre_matching` and `post_matching` rows

If required phases are missing, export is blocked and the finish page lists validation errors instead of downloading or uploading data.
