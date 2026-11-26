# R4 lord tax policy / scalar wire candidate

Base a0bbf00. Actual lord-s.cgi taxside and treset mutate target taxmode; normal/reset delete the key. DataWrite joins undef as an empty scalar column; DataRead splits it as an empty string. Literal numeric 0 and blank therefore have identical taxation but different wire bytes.

- Test-only exact revision/current lord/target policy projection. Original raw fallback mode is normal, but candidate accepts only free/double/normal. Raw PushLog argument shape preserved, not a rendered log. No fake original session authentication.
- 40 policy fixtures (five prior states × four actions × two EVENT states), exact pinned Perl handler plus actual scalar field join/split expressions. Two-shop source fixtures; single-shop codec independently checks each output row's taxmode column, not an assertion of multiplayer save support.
- Explicit lordTaxWire opt-in to existing source-reviewed period play codec. Valid rate 0..40, modes blank/absent/0/1/2. Reload blank as empty string, preserve original column. Explicit conversion to absent for tax calculator in the test adapter. No live world disk caller passes the opt-in.
- Existing disk wire still hardcodes taxRate=0; no WorldState/CAS/history/backup authorization or official gameplay enabled. Rebellion NOW can preserve rate after suppression/player victory or clear rate on NPC succession. Same-command slices must consume live EVENT and tax rate, not frozen DataRead tax context. This is a remaining integration gate.
- Added separate fiscal source CI job so results do not wait behind full suite or long genuine-player acceptance. Pending actual execution.
