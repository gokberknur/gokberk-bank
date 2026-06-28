<script lang="ts">
	// P06 · A deep link to one mandate — renders the manage surface with that row's
	// drawer already open. Same component as the index, so the table and the upcoming
	// card sit intact behind the drawer and cancel/dispute behave identically.
	import { page } from '$app/state';
	import MandatesManage from '$lib/components/payments/MandatesManage.svelte';
</script>

<svelte:head>
	<title>Direct debit · gökberk bank</title>
</svelte:head>

<MandatesManage openId={page.params.id} />
