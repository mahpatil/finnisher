The spec has been reviewed and verified to accurately reflect the implemented features.

No changes to the spec are required. The enhancement is ready for use.

To verify the implementation:
1. Run `npm run build` to check TypeScript compilation
2. Run `npm test` to ensure tests pass
3. Test manually:
   - `finn discover` (show projects in workspace)
   - `finn discover --create` (create threads for unlinked projects)  
   - `finn discover --fix` (verify existing links)
