/**
 * EDH — the shell row.
 *
 * This Host row has no behaviour of its own. It exists because a package's
 * browser half is served for the row whose module name is the bare package name:
 * keeping this row enabled keeps the EDH control mounted while individual feature
 * rows are switched on and off.
 *
 * Features live in their own modules and their own rows (`@moreweb/edh/retry`
 * today); add one by editing `cordis.patch.yml` and this directory, never by
 * stacking behaviour onto the shell.
 */
export function apply() {}
