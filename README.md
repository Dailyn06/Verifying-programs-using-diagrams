# Verifying Programs Using Diagrams

## Purpose

Make the structure of a formal argument visible before checking it in Isabelle/HOL. The browser editor turns a hand-built proof diagram into a reasoning summary and a draft Isabelle theory.

## Aims

- Represent assumptions, known theorems, proof steps, decisions, and results on a draggable canvas.
- Show which premises and intermediate results feed each proof step.
- Group related steps into a reusable lemma and generate Isabelle text for manual review.

## Project contents

| Path | Role |
| --- | --- |
| [`FinalVersion.html`](FinalVersion.html) | Defines and styles the canvas, editing controls, encapsulation panel, and code preview. |
| [`FinalVersion.js`](FinalVersion.js) | Handles diagram editing, directed connections, dependency analysis, proof grouping, and Isabelle generation. |

## Implementation

The editor represents the diagram as nodes joined by directed connections. It uses those connections to identify each proof step's inputs and outputs and topologically order dependent steps. For a selected group, it collects inputs, external dependencies, and outputs to draft a reusable lemma. The generator converts logical notation to Isabelle syntax and uses proof-step labels to choose tactics for patterns such as conjunction elimination and modus ponens.

### Try it

1. Keep both files in the same directory and open `FinalVersion.html` in a browser.
2. Add and label the nodes. Use **Connect Mode** to link premises to proof steps and proof steps to their results in dependency order.
3. Use **Encapsulate** to group a subproof if needed, then click **Generate Isabelle**.
4. Review the reasoning summary and copy the generated text into `ProofGenerated.thy` for checking in Isabelle/HOL.

## Results

The editor displays the reasoning steps and a copyable `ProofGenerated` theory that imports `Main`. It can emit reusable lemmas for grouped steps and a main proof from the diagram. Known-theorem nodes are emitted as axioms, and some fallback paths can leave `sorry` placeholders. The browser generates the text without running Isabelle.

## Conclusion

The editor makes proof dependencies explicit and gives users a starting point for writing Isabelle proofs. A verified result requires checking the generated theory in Isabelle/HOL, reviewing its axioms, and resolving any unfinished proof steps.
