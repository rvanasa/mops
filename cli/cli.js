#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {program} from 'commander';
import chalk from 'chalk';

import {init} from './commands/init.js';
import {install} from './commands/install.js';
import {publish} from './commands/publish.js';
import {importPem} from './commands/import-identity.js';
import {sources} from './commands/sources.js';
import {checkApiCompatibility, getHighestVersion, getNetwork, parseGithubURL, readConfig, setNetwork, writeConfig, apiVersion, mainActor} from './mops.js';
import {whoami} from './commands/whoami.js';
import {installAll} from './commands/install-all.js';
import logUpdate from 'log-update';
import {installFromGithub} from './vessel.js';
import asTable from 'as-table';

let cwd = process.cwd();
let configFile = path.join(cwd, 'mops.toml');

program.name('mops');

// --version
let packageJson = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url)));
program.version(`CLI ${packageJson.version}\nAPI ${apiVersion}`, '-v --version');

// init
program
	.command('init [name]')
	.description('Create mops.toml')
	.action(async (name) => {
		await init(name);
	});

// install
program
	.command('install [pkg]')
	.alias('i')
	.alias('add')
	.description('Install package and save it as a dependency in the mops.toml file')
	.option('--verbose', '')
	.action(async (pkg, options) => {
		let config = {};
		let exists = fs.existsSync(configFile);
		if (exists) {
			config = readConfig(configFile);
		}
		else {
			console.log(chalk.red('Error: ') + `mops.toml not found. Please run ${chalk.green('mops init')} first`);
			return;
		}
		if (!config.dependencies) {
			config.dependencies = {};
		}

		let compatible = await checkApiCompatibility();
		if (!compatible) {
			return;
		}

		if (!pkg) {
			installAll(options);
			return;
		}

		let pkgDetails;
		let existingPkg = config.dependencies[pkg];

		if (pkg.startsWith('https://github.com') || pkg.split('/') > 1) {
			const {org, gitName, branch} = parseGithubURL(pkg);

			pkgDetails = {
				name: parseGithubURL(pkg).gitName,
				repo: `https://github.com/${org}/${gitName}#${branch}`,
				version: ''
			};

			existingPkg = config.dependencies[pkgDetails.name];
		}
		else if (!existingPkg || !existingPkg.repo) {
			let ver;
			if (pkg.includes('@')) {
				[pkg, ver] = pkg.split('@');
			}
			else {
				let versionRes = await getHighestVersion(pkg);
				if (versionRes.err) {
					console.log(chalk.red('Error: ') + versionRes.err);
					return;
				}
				ver = versionRes.ok;
			}

			pkgDetails = {
				name: pkg,
				repo: '',
				version:  ver,
			};

		}
		else {
			options.silent || logUpdate(`Installing ${existingPkg.name}@${existingPkg.version} (cache) from Github`);
			return;
		}

		const {name, repo, version} = pkgDetails;

		if (repo) {
			// pkg name conflict with an installed mops pkg
			if (existingPkg && !existingPkg.repo) {
				console.log(chalk.red('Error: ') + `Conflicting Package Name '${name}`);
				console.log('Consider entering the repo url and assigning a new name in the \'mops.toml\' file');
				return;
			}

			await installFromGithub(name, repo, {verbose: options.verbose});
		}
		else {
			let ok = await install(name, version, {verbose: options.verbose});
			if (!ok) {
				return;
			}
		}

		config.dependencies[name] = pkgDetails;
		writeConfig(config);

		logUpdate.clear();
		console.log(
			chalk.green('Package installed ') + `${name} = "${repo || version}"`
		);
	});

// publish
program
	.command('publish')
	.description('Publish package to the mops registry')
	.action(async () => {
		let compatible = await checkApiCompatibility();
		if (compatible) {
			await publish();
		}
	});

// set-network
program
	.command('set-network <network>')
	.description('Set network local|dev|ic')
	.action(async (network) => {
		await setNetwork(network);
		console.log(`Selected '${network}' network`);
	});

// get-network
program
	.command('get-network')
	.description('Get network')
	.action(async () => {
		console.log(getNetwork().network);
	});

// import-identity
program
	.command('import-identity <data>')
	.description('Import .pem file data to use as identity')
	.action(async (data) => {
		await importPem(data);
		whoami();
	});

// sources
program
	.command('sources')
	.description('for dfx packtool')
	.option('--verbose', '')
	.action(async (options) => {
		await sources(options);
	});

// whoami
program
	.command('whoami')
	.description('prints your principal')
	.action(async () => {
		whoami();
	});

// search
program
	.command('search <text>')
	.alias('find')
	.description('Search for packages')
	.action(async (text) => {
		let actor = await mainActor();
		let res = await actor.search(text);

		let ellipsis = (text, max) => {
			if (text.length <= max) {
				return text;
			}
			else {
				return text.slice(0, max) + '…';
			}
		};

		let maxNameLength = Math.max(...res.map(a => a.config.name.length));

		let table = res.map((item) => {
			return {
				NAME: chalk.bold(item.config.name),
				VERSION: item.config.version,
				DESCRIPTION: ellipsis(item.config.description, process.stdout.columns - 40 - maxNameLength),
				UPDATED: new Date(Number(item.publication.time / 1_000_000n)).toISOString().split('T')[0],
			};
		});

		console.log('');
		console.log(asTable.configure({
			delimiter: chalk.gray(' | '),
			dash: chalk.gray('─'),
			title: t => chalk.gray.bold(t),
		})(table));
		console.log('');
	});

program.parse();