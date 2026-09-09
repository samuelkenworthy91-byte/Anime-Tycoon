# Anime Runner — Cast V4 upload staging

This directory is a flat landing zone for all Cast V4 source crops uploaded from the phone batches.

## Important
- The **batch folders exist only inside the ZIP / on the phone** for easier uploading.
- **Do not recreate the batch folders in Git.**
- Upload the PNG files from every local batch directly into this one `cast_v4_upload_staging/` directory.
- Keep the numeric filename prefixes exactly as supplied; they prevent collisions and preserve source order.
- Do not resize, square-crop, recompress, rename, or convert the PNGs before upload.

The corrected all-source package contains **336 actual generated character crops**: every primary Arena panel, the extra/donor Sheet-8 generation, and all 16 repair-sheet cells. This staging area intentionally keeps donor/replaced art as well as the final candidates so the integration pass can make the final mapping from the full source pool.

After upload, the integration pass will:
1. verify the complete uploaded source count;
2. map source crops to the optimized Cast V4 manifest;
3. select the final 304 required portraits and retain useful donors;
4. create/finalize names, archetypes, personalities and runtime metadata;
5. normalize selected portraits to the existing runtime 512×512 WebP presentation;
6. run anatomy/genre/duplicate QC;
7. verify strict 2,024 / 2,024 Role × Anime Type × genre-pair coverage before runtime integration.
