/**
 * edit — message editing for the Harness Web UI.
 *
 * The feature lives entirely in the browser half (`./client`): the Session log is
 * append-only, so editing is implemented as fork-before-the-message plus a
 * composer hand-off, and neither half needs Host state. This row exists so the
 * feature has its own switchable seat in the Cordis bundle: turning it off hides
 * the Edit action without unloading the rest of EDH.
 */
export const name = 'edh-edit'

/**
 * Host half of the edit feature.
 *
 * Intentionally empty: everything the feature does happens in the browser.
 */
export function apply() {}
