# Online Experiment

This directory contains a standalone jsPsych-based experiment for:

- pre/post SD ratings
- stimulus selection based on low evaluation scores
- brightness matching trials
- condition-dependent writing tasks
- CSV export for analysis

## Standalone status

`online-experiment/` is now self-contained. It does not depend on files in the parent `shuron-reference-library` directory.

The repository-safe default is:

- manual condition assignment
- local CSV download
- no DataPipe upload

That makes the project safe to publish on GitHub without exposing an active experiment configuration.

## Local run

```powershell
cd online-experiment
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080).

## Runtime configuration

Edit `runtime-config.js` when you want to enable DataPipe-backed condition assignment or upload.

Safe public default:

```javascript
globalThis.EXPERIMENT_RUNTIME = {
  dataPipe: {
    useConditionAssignment: false,
    saveData: false,
    experimentId: "",
  },
};
```

Typical deployment change:

```javascript
globalThis.EXPERIMENT_RUNTIME = {
  dataPipe: {
    environmentName: "production",
    useConditionAssignment: true,
    saveData: true,
    experimentId: "your-datapipe-id",
    osfProjectId: "your-osf-project-id",
    osfDataComponentId: "your-osf-component-id",
    conditionEndpoint: "https://pipe.jspsych.org/api/condition/",
    dataEndpoint: "https://pipe.jspsych.org/api/data/",
  },
};
```

If `saveData` remains `false`, the app automatically falls back to local CSV download mode.

## Tests

Smoke tests:

```powershell
npm run test:smoke
```

End-to-end test:

```powershell
npm test
```

## GitHub Pages artifact

Build the deployable static artifact:

```powershell
npm run build
```

The output is written to `dist/pages/`.

## Export as a separate repository

Create a clean standalone copy next to the current repository:

```powershell
npm run export:standalone
```

That writes a new directory at `../online-experiment-public` without `node_modules`, browser profiles, screenshots, or test result dumps.

If you want to preserve history when splitting this folder into a new Git repository, do that only after you have cleaned tracked generated files from the source repository. The safer default is the standalone export above.

History-preserving split reference:

```powershell
git subtree split --prefix online-experiment -b codex/online-experiment-public
```

Then push that branch to a new GitHub repository.
