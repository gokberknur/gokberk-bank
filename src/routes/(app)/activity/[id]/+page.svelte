<script lang="ts">
	// X02 — the deep-linkable detail. Same shared ActivityPage as /activity, but
	// with the route's id passed through, so the feed renders underneath and the
	// gok-drawer opens on this event (and marks it read). An unknown id falls to the
	// drawer's own not-found state; closing the drawer routes back to /activity.
	import { page } from '$app/state';
	import ActivityPage from '$lib/components/activity/ActivityPage.svelte';
</script>

<svelte:head>
	<title>Activity · gökberk bank</title>
</svelte:head>

<ActivityPage activeId={page.params.id} />
