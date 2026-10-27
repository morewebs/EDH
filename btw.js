/**
 * btw — side conversations for the Harness Web UI.
 *
 * `/btw` and `/side` open a side chat: a Session forked from the current one, so
 * it carries this conversation's context, opened at once and listed beside its
 * parent like any other Session. The feature lives entirely in the browser half
 * (`./client`) — it registers two `commandUi` actions there, and the fork is the
 * shipped `sessions.fork`, so neither half needs Host state of its own. This row
 * exists so the feature has its own switchable seat in the Cordis bundle:
 * turning it off takes both commands out of the slash menu without unloading the
 * rest of EDH.
 */
export const name = 'edh-btw'

/**
 * Host half of the side-chat feature.
 *
 * Intentionally empty: everything the feature does happens in the browser.
 */
export function apply() {}
