# Reference lookup — reading the local clone

Plotly's attribute surface is enormous and versioned. **Do not guess an attribute name, default, or allowed
values — read them from the clone at `.claude/gitrepos/plotly.js` (v3.7.0).** This file is the map of where
everything is and the grep recipes to get there fast.

## The one thing to know: `attributes.js` files ARE the schema

Every trace's options live in a plain nested-object module: **`src/traces/<type>/attributes.js`**. Layout
options live in **`src/plots/**/layout_attributes.js`**. `Plotly.PlotSchema.get()` is literally an
aggregation/serialization of these files — so reading the source *is* reading the schema, one version-exact
step closer than any docs site.

Each **leaf attribute** is an object carrying metadata:

| Field | Meaning | Defined in |
|---|---|---|
| `valType` | value kind: `data_array`, `enumerated`, `boolean`, `number`, `integer`, `string`, `color`, `colorlist`, `colorscale`, `angle`, `subplotid`, `flaglist`, `any`, `info_array` | `src/lib/coerce.js` (`valObjectMeta`) |
| `dflt` | the default value | — |
| `editType` | which redraw stage a change triggers (`calc`, `plot`, `style`, …) — tells you how expensive a prop change is | `src/plot_api/edit_types.js` |
| `description` | human-readable docs (array `.join(' ')`) | — |
| `values` / `flags` / `extras` | allowed set for `enumerated` / `flaglist` | — |
| `min` / `max` / `arrayOk` / `anim` | numeric bounds; whether it accepts a per-point array; whether it animates | — |

A **container** attribute (e.g. `line`, `marker`, `increasing`) is an object whose non-meta keys are child
attributes. **Dotted access mirrors the nesting** — `line.color`, `marker.size`, `increasing.line.width` —
and it's the exact string `Plotly.restyle` takes.

## Where to look

| You want… | Read |
|---|---|
| A trace's options (line/marker/fill/hover…) | `src/traces/<type>/attributes.js` |
| Attributes shared by **all** traces (`name`, `opacity`, `hoverinfo`, `legend`, `visible`, `showlegend`, `legendgroup`, `customdata`, `meta`, `uid`) | `src/plots/attributes.js` |
| Global layout (`paper_bgcolor`, `plot_bgcolor`, `font`, `colorway`, `margin`, `legend`, `title`, `hovermode`, `hoverlabel`, `transition`, `template`, `annotations`, `shapes`, `images`) | `src/plots/layout_attributes.js` |
| Cartesian **axis** options (`gridcolor`, `zerolinecolor`, `linecolor`, `tickcolor`, `tickfont`, `tickformat`, `hoverformat`, `type`, `range`, `rangeslider`, `rangeselector`, `showgrid`, `zeroline`) | `src/plots/cartesian/layout_attributes.js` (+ `axis_format_attributes.js`) |
| Font attributes (family/size/color/weight/style) | `src/plots/font_attributes.js` |
| hover/text template attrs + colorbar factory | `src/plots/template_attributes.js` |
| Polar / ternary / smith / geo / map / 3-D subplot layout | `src/plots/<polar|ternary|smith|geo|map|mapbox>/layout_attributes.js`, `src/plots/gl3d/layout/scene.js` |
| What a `valType` means | `src/lib/coerce.js` (`valObjectMeta`) |
| What an `editType` costs | `src/plot_api/edit_types.js` |

## Grep recipes

```bash
CLONE=.claude/gitrepos/plotly.js

# All options of one trace type, with their line numbers:
grep -nE "^\s+[a-z0-9_]+:\s*\{" $CLONE/src/traces/candlestick/attributes.js

# Find which trace(s) define an attribute (e.g. `fillgradient`):
grep -rl "fillgradient" $CLONE/src/traces/*/attributes.js

# Read the default + description of a specific attribute (e.g. scatter line.shape):
grep -nA6 "shape:" $CLONE/src/traces/scatter/attributes.js

# Every layout axis knob:
grep -nE "^\s+[a-z0-9_]+:\s*\{" $CLONE/src/plots/cartesian/layout_attributes.js

# Confirm allowed values of an enumerated/flaglist attribute:
grep -nA4 "values:" $CLONE/src/traces/scatter/attributes.js | grep -A4 "mode"
```

## Programmatic introspection (when a runtime check helps)

- **`Plotly.validate(data, layout)`** (`src/plot_api/validate.js:33`) — pure; returns an array of error
  objects for unknown/mis-typed attributes. Handy as a dev-time assertion while building a wrapper:
  `if (import.meta.env.DEV) console.warn(Plotly.validate(fig.data, fig.layout));`
- **`Plotly.PlotSchema.get()`** (`src/plot_api/plot_schema.js:41`) — the whole schema as a JS object
  (`schema.traces[type].attributes`, `schema.layout.layoutAttributes`, `schema.defs.valObjects`). Useful to
  script a lookup, but for one-off questions grepping the `attributes.js` is faster.

## Worked example — candlestick (finance)

`src/traces/candlestick/attributes.js` **composes** ohlc + box:
- Data borrowed from ohlc: `x`, `open`, `high`, `low`, `close` (`:28–32`).
- Hover formats: `xhoverformat` / `yhoverformat` (`:25–26`); period: `xperiod*` (`:22–24`).
- **`increasing`** (`:46`) and **`decreasing`** (`:48`) — each a `{ line: { color, width }, fillcolor }`
  produced by the local `directionAttrs()` factory (`:8–19`).
- **Defaults are Plotly green/red** — `increasing #3D9970`, `decreasing #FF4136` (`src/constants/delta.js`).
  The bank **must** re-map these to `--gok-color-status-success` / `-error` (resolved) and keep the shape +
  number, never color alone (see `theming-and-tokens.md` / `chart-recipes.md`).

## hovertemplate / texttemplate (money & date formatting)

Declared by factories in `src/plots/template_attributes.js` (`hovertemplateAttrs:43`, `texttemplateAttrs:60`);
parsed in `src/lib/index.js` (`TEMPLATE_STRING_REGEX:1045`, engine `templateFormatString:1133`). Grammar:
- Variable: `%{x}`, `%{y}`, `%{customdata}`, `%{customdata[0]}`, `%{fullData.name}`.
- **Number (d3-format):** `%{y:$,.2f}`, `%{y:,.0f}` — the inline hook for money.
- Date (d3-time-format): `%{x|%d %b %Y}`.
- `<extra></extra>` controls/clears the secondary hover box.

For minor-unit money, either pass **pre-formatted strings in `customdata`** and reference `%{customdata}`,
or use an inline d3-format with a scaled value. Keep the data in integer minor units; format only at render.
