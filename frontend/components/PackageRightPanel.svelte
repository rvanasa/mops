<script lang="ts">
	import {PackageDetails} from '/declarations/main/main.did.js';
	import DownloadTrend from './DownloadTrend.svelte';

	export let packageDetails: PackageDetails;
</script>

<div class="right-panel">
	<div class="downloads">
		<div class="detail">
			<div class="label">Downloads</div>
			<div class="value">{packageDetails.downloadsTotal}</div>
		</div>
		<DownloadTrend snapshots={packageDetails.downloadTrend}></DownloadTrend>
	</div>
	{#if packageDetails.config.repository}
		<div class="detail">
			<div class="label">Repository</div>
			<a class="value repository" href="{packageDetails.config.repository}" target="_blank">
				<img class="github-icon" src="/img/github.svg" alt="GitHub logo" loading="lazy" />
				{packageDetails.config.repository.replace(/https?:\/\/(www\.)?(github\.com\/)?/, '')}
			</a>
		</div>
	{/if}
	{#if packageDetails.config.documentation}
		<div class="detail">
			<div class="label">Documentation</div>
			<a class="value" href="{packageDetails.config.documentation}" target="_blank">{packageDetails.config.documentation.replace(/https?:\/\/(www\.)?/, '')}</a>
		</div>
	{/if}
	{#if packageDetails.config.license}
		<div class="detail">
			<div class="label">License</div>
			<a class="value" href="https://spdx.org/licenses/{packageDetails.config.license}.html" target="_blank">{packageDetails.config.license}</a>
		</div>
	{/if}
	{#if packageDetails.owner}
		<div class="detail">
			<div class="label">Owner</div>
			<div class="value">{packageDetails.owner}</div>
		</div>
	{/if}
</div>

<style>
	.right-panel {
		width: 240px;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.downloads {
		display: flex;
		align-items: flex-end;
		gap: 5px;
		justify-content: space-between;
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.label {
		font-weight: bold;
		color: #303030;
	}

	.value {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.repository {
		display: flex;
		align-items: center;
		line-height: 1;
		gap: 5px;
		white-space: normal;
	}

	.github-icon {
		width: 20px;
		height: 20px;
		filter: hue-rotate(45deg) contrast(0.6);
	}

	@media (max-width: 750px) {
		.right-panel {
			margin-left: 20px;
			margin-bottom: 20px;
		}
	}
</style>