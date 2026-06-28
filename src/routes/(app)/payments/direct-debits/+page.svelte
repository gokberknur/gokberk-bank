<script lang="ts">
	// P06 · SEPA Direct Debit mandates — the manage surface. The upcoming-collections
	// card, the mandates table, the row drawer, and the cancel/dispute controls all live
	// in MandatesManage; this page is just its mount.
	import MandatesManage from '$lib/components/payments/MandatesManage.svelte';
</script>

<svelte:head>
	<title>Direct debits · gökberk bank</title>
</svelte:head>

<MandatesManage />
