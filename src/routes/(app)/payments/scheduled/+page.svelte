<script lang="ts">
	// P05 · Scheduled payments — the manage surface. The table, the row drawer, and the
	// pause/cancel controls all live in ScheduledManage; this page is just its mount.
	import ScheduledManage from '$lib/components/payments/ScheduledManage.svelte';
</script>

<svelte:head>
	<title>Scheduled · gökberk bank</title>
</svelte:head>

<ScheduledManage />
