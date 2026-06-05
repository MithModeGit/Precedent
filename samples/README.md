# Sample NDAs

Example documents for running Precedent end to end by hand.

## Cross-Border-Data-Partnership-NDA.docx

A deliberately adversarial NDA between a US health system and a UK data lab. It is built to
stress the redline engine and the evaluator: it contains undefined operative terms, a
contradiction between its survival clause and its global liability cutoff, a broken
cross-reference and a missing exhibit, a cross-border data-protection obligation outside the
reference database, a contested residuals clause, identifiable patient data shared with no
HIPAA Business Associate Agreement, and a non-solicitation under Delaware law (where the
California §16600 flag should not fire).

Upload it from the home screen, review the redlines, and open the evaluation to see the
precision and coverage scores. Regenerate it from the markdown source with:

```
npx tsx scripts/make-sample-docx.ts
```
