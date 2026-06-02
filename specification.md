# Online Experiment Specification

## Flow

The participant flow is:

1. intro
2. consent
3. pre-SD ratings for all active stimuli
4. selection of target, controls, and post-SD set
5. pre-matching for target + controls
6. condition-dependent writing task
7. post-matching for target + controls
8. post-SD ratings for the selected post-SD set
9. data export
10. finish

The matching phase is required in both pre and post positions. Export must be blocked if either matching phase is missing or incomplete.

## Selection

- Target stimulus: lowest evaluation score from pre-SD
- Control stimuli: next `controlStimulusCount` stimuli after the target
- Post-SD stimuli: the first `postSdLowScoreCount` items from the low-score-ranked list
- Tie breaking uses `displayOrder`

## Writing conditions

- `counter_attitudinal`
  - writing target: selected target stimulus
  - task: write from the opposite evaluative perspective
- `objective_description_control`
  - writing target: selected target stimulus
  - task: write an objective description
- `irrelevant_control`
  - writing target: first selected control stimulus
  - task: write unrelated daily-life content

## Matching

- Matching uses the selected target plus all selected controls.
- Each artwork receives `trialsPerArtwork` trials.
- Each artwork must include:
  - `dark_start`: `directionsPerArtwork.darkStart`
  - `bright_start`: `directionsPerArtwork.brightStart`
- Trial records must include:
  - `phase`
  - `stimulus_id`
  - `stimulus_role`
  - `trial_index_within_artwork`
  - `start_direction`
  - `initial_value`
  - `matching_value`
  - `adjustment_count`

## Export and validation

- Normal mode exports through DataPipe when enabled.
- `save=download` downloads the CSV locally instead of uploading.
- Preview mode never uploads or downloads.
- Before any export, the app validates:
  - target stimulus exists
  - control stimulus count matches config
  - exactly one writing response exists and is non-empty
  - pre-matching trial count matches expected
  - post-matching trial count matches expected
- Validation failure must block export and surface the errors on the finish page.
