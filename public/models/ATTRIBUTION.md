# Reference anatomy

Credit: HuBMAP Consortium / Human Reference Atlas. Female 3D Reference Organ Set v1.5, based on National Library of Medicine Visible Human Female data.

- Dataset: https://doi.org/10.48539/HBM352.BTSQ.586
- Original: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb
- License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- Web optimization by Femora Atlas (mesh simplification and Meshopt): https://github.com/zer01dollars/female-body-atlas
- Imported from: https://github.com/zer01dollars/female-body-atlas/blob/main/public/models/female-atlas.glb
- Source SHA-256: de5733210985407208deea72a2f6936724f444f0f2ab44b66b169db555193c97
- Subset SHA-256: 0034ce42fc9249581d778049e364ff4158be2c123540135631c7ef8fa6215e3a

VozCare retains the body surface, colon, small intestine, and liver segments (30 meshes, 41 nodes). Extraction preserves geometry, anatomical labels, and native spatial alignment. Display colors, transparency, camera views, and selection highlighting are changed. Reproduce the subset with `tools/extract-anatomy.py` and the source GLB above.

The reference represents generic anatomy. It is not a patient scan. The separate inner-colon, wall-layer, growth, and surgery illustrations are procedural VozCare examples, not HRA data or patient findings. No application code from Femora Atlas is copied.
