// Registers every gök element the bank uses.
//
// The published package's "." barrel is side-effect-free (it exports classes
// only). Registration happens through the per-element side-effect subpaths —
// `@gokberknur/design-system/gok-<name>` — which call customElements.define.
//
// Imported once from the root +layout.svelte (client only — ssr is off), so the
// elements are defined before any route uses them. When the design system is
// linked locally (npm link) these resolve to the linked build, so component
// edits flow straight into the app (dogfooding).

import '@gokberknur/design-system/gok-accordion';
import '@gokberknur/design-system/gok-accordion-item';
import '@gokberknur/design-system/gok-alert';
import '@gokberknur/design-system/gok-badge';
import '@gokberknur/design-system/gok-breadcrumb';
import '@gokberknur/design-system/gok-breadcrumb-item';
import '@gokberknur/design-system/gok-button';
import '@gokberknur/design-system/gok-card';
import '@gokberknur/design-system/gok-checkbox';
import '@gokberknur/design-system/gok-dialog';
import '@gokberknur/design-system/gok-divider';
import '@gokberknur/design-system/gok-drawer';
import '@gokberknur/design-system/gok-empty-state';
import '@gokberknur/design-system/gok-icon';
import '@gokberknur/design-system/gok-input';
import '@gokberknur/design-system/gok-link';
import '@gokberknur/design-system/gok-menu';
import '@gokberknur/design-system/gok-menu-item';
import '@gokberknur/design-system/gok-navbar';
import '@gokberknur/design-system/gok-navbar-item';
import '@gokberknur/design-system/gok-pagination';
import '@gokberknur/design-system/gok-popover';
import '@gokberknur/design-system/gok-progress';
import '@gokberknur/design-system/gok-radio';
import '@gokberknur/design-system/gok-radio-group';
import '@gokberknur/design-system/gok-segmented';
import '@gokberknur/design-system/gok-segmented-item';
import '@gokberknur/design-system/gok-select';
import '@gokberknur/design-system/gok-option';
import '@gokberknur/design-system/gok-sidenav';
import '@gokberknur/design-system/gok-sidenav-item';
import '@gokberknur/design-system/gok-sidenav-section';
import '@gokberknur/design-system/gok-skeleton';
import '@gokberknur/design-system/gok-spinner';
import '@gokberknur/design-system/gok-switch';
import '@gokberknur/design-system/gok-tabs';
import '@gokberknur/design-system/gok-tab';
import '@gokberknur/design-system/gok-tab-panel';
import '@gokberknur/design-system/gok-table';
import '@gokberknur/design-system/gok-tag';
import '@gokberknur/design-system/gok-theme-switch';
import '@gokberknur/design-system/gok-toast';
import '@gokberknur/design-system/gok-toast-region';
import '@gokberknur/design-system/gok-toc';
import '@gokberknur/design-system/gok-toc-item';
import '@gokberknur/design-system/gok-tooltip';
