<script lang="ts">
	// X02 — the unified activity feed. The route is thin: it mounts the shared
	// ActivityPage with no active id, so the drawer is closed. /activity/[id] mounts
	// the same component with an id, opening the detail drawer over this same feed.
	import ActivityPage from '$lib/components/activity/ActivityPage.svelte';
</script>

<svelte:head>
	<title>Activity · gökberk bank</title>
</svelte:head>

<ActivityPage />
