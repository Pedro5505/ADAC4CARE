# GP implementation lab companion

Read `GP-User-Module-Implementation-Lab.md` or the PDF in `../pdf/` before running the exercises.

This directory belongs at:

```text
C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\output\gp-lab
```

The ZIP contains a `gp-lab/` folder. If using the ZIP, extract that folder into the existing repository's `output/` directory. The helper scripts resolve the repository as two directories above themselves; they require the original `frontend/` and `backend/` source tree.

- `New-GpLab.ps1` creates a separate scaffold at `work/gp-user-lab`, including fresh environment examples. It refuses to overwrite an existing destination.
- `Start-Rebuild.ps1` moves nine GP implementation files from that scaffold into `work/gp-user-lab/reference/frontend`. Run it only at step (1), after the baseline boot check and stopping the frontend.
- `wrangler.lab.json` supplies the local database binding/migration configuration copied into the scaffold. Use the documented `--local` commands.
- `Test-GpWorkflow.mjs` exercises the local HTTP contract using a previously unused regular row 8. It refuses remote hosts and existing row history.
- `source/` contains complete copies of referenced application files for comparison. It is not a standalone installable application.
- `source-manifest.json` records original file hashes and exact excerpt locations.
- `VALIDATION.md` distinguishes executed author checks from learner exercises.

The scripts and request fixture are new teaching aids. Application code in `source/` is copied from the repository. No existing credentials, databases, installed dependencies or reference PDFs are included.

Use the Markdown companion when copying code; the PDF wraps long source lines for readability.
