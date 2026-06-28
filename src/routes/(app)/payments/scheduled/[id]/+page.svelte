<script lang="ts">
	// P05 · A deep link to one scheduled payment — renders the manage surface with that
	// row's drawer already open. Same component as the index, so the table is intact
	// behind the drawer and pause/cancel behave identically.
	import { page } from '$app/state';
	import ScheduledManage from '$lib/components/payments/ScheduledManage.svelte';
</script>

<svelte:head>
	<title>Scheduled payment · gökberk bank</title>
</svelte:head>

<ScheduledManage openId={page.params.id} />
