"use strict";

const JSON_URL = "data/sjships.json";

const renderer = Renderer.get();

window.onload = async function load () {
	await ExcludeUtil.pInitialise();
	SortUtil.initHandleFilterButtonClicks();
	DataUtil.loadJSON(JSON_URL).then(onJsonLoad);
};

const sourceFilter = getSourceFilter();
let filterBox;
let list;
async function onJsonLoad (data) {
	list = ListUtil.search({
		valueNames: ["name", "source", "uniqueid"],
		listClass: "sjships",
		sortFunction: SortUtil.listSort
	});

	filterBox = await pInitFilterBox(
		sourceFilter
	);

	list.on("updated", () => {
		filterBox.setCount(list.visibleItems.length, list.items.length);
	});

	// filtering function
	$(filterBox).on(
		FilterBox.EVNT_VALCHANGE,
		handleFilterChange
	);

	const subList = ListUtil.initSublist({
		valueNames: ["name", "id"],
		listClass: "subships",
		getSublistRow: getSublistItem
	});
	ListUtil.initGenericPinnable();

	addShips(data);
	addWeapons(data);
	BrewUtil.pAddBrewData()
		.then(handleBrew)
		.then(() => BrewUtil.bind({list}))
		.then(() => BrewUtil.pAddLocalBrewData())
		.catch(BrewUtil.pPurgeBrew)
		.then(async () => {
			BrewUtil.makeBrewButton("manage-brew");
			BrewUtil.bind({filterBox, sourceFilter});
			await ListUtil.pLoadState();
			RollerUtil.addListRollButton();
			ListUtil.addListShowHide();

			History.init(true);
			ExcludeUtil.checkShowAllExcluded(shipList, $(`#pagecontent`));
		});
}

function handleBrew (homebrew) {
	addShips({sjship: homebrew.sjship});
	return Promise.resolve();
}

let shipList = [];
let weaponList = [];
let shI = 0;
function addShips (data) {
	if (!data.sjship || !data.sjship.length) {
		return;
	}
	shipList = shipList.concat(data.sjship);

	let tempString = "";
	for (; shI < shipList.length; shI++) {
		const it = shipList[shI];

		if (ExcludeUtil.isExcluded(it.name, "ship", it.source)) {
			continue;
		}

		const abvSource = Parser.sourceJsonToAbv(it.source);
		tempString += `
			<li class="row" ${FLTR_ID}="${shI}" onclick="ListUtil.toggleSelected(event, this)" oncontextmenu="ListUtil.openContextMenu(event, this)">
				<a id="${shI}" href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
					<span class="name col-10">${it.name}</span>
					<span class="source col-2 text-align-center ${Parser.sourceJsonToColor(abvSource)}" title="${Parser.sourceJsonToFull(it.source)}">${abvSource}</span>
					
					<span class="uniqueid hidden">${it.uniqueId ? it.uniqueId : shI}</span>
				</a>
			</li>
		`;

		// populate filters
		sourceFilter.addIfAbsent(it.source);
	}
	const lastSearch = ListUtil.getSearchTermAndReset(list);
	$(`#sjshipList`).append(tempString);

	// sort filters
	sourceFilter.items.sort(SortUtil.ascSort);

	list.reIndex();
	if (lastSearch) {
		list.search(lastSearch);
	}
	list.sort("name");
	filterBox.render();
	handleFilterChange();

	ListUtil.setOptions({
		itemList: shipList,
		getSublistRow: getSublistItem,
		primaryLists: [list]
	});
	ListUtil.bindPinButton();
	Renderer.hover.bindPopoutButton(shipList);
	UrlUtil.bindLinkExportButton(filterBox);
	ListUtil.bindDownloadButton();
	ListUtil.bindUploadButton();
}

function addWeapons (data) {
	if (!data.sjweapon || !data.sjweapon.length) {
		return;
	}
	weaponList = weaponList.concat(data.sjweapon);
}

// filtering function
function handleFilterChange () {
	const f = filterBox.getValues();
	list.filter(function (item) {
		const it = shipList[$(item.elm).attr(FLTR_ID)];
		return filterBox.toDisplay(
			f,
			it.source
		);
	});
	FilterBox.nextIfHidden(shipList);
}

function getSublistItem (it, pinId) {
	return `
		<li class="row" ${FLTR_ID}="${pinId}" oncontextmenu="ListUtil.openSubContextMenu(event, this)">
			<a href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
				<span class="name col-12">${it.name}</span>
				<span class="id hidden">${pinId}</span>
			</a>
		</li>
	`;
}

function loadhash (id) {
	const ship = shipList[id];

	renderStatblock(ship);

	// Renderer.get().setFirstSection(true);
	// const $content = $(`#pagecontent`).empty();
	// Renderer.sjship.getRenderedString($content, ship);

	loadsub([]);
	ListUtil.updateSelected();
}

function renderStatblock (ship) {
	// lastRendered.mon = mon;
	// lastRendered.isScaled = isScaled;
	renderer.setFirstSection(true);

	const $content = $("#pagecontent").empty();
	// const $wrpBtnProf = $(`#wrp-profbonusdice`);
	//
	// if (profBtn !== null) {
	// 	$wrpBtnProf.append(profBtn);
	// 	profBtn = null;
	// }

	function buildStatsTab () {
		$content.append(Renderer.sjship.getRenderedString(ship, weaponList));

		// const $floatToken = $(`#float-token`).empty();
		// if (mon.tokenUrl || !mon.uniqueId) {
		// 	const imgLink = Renderer.monster.getTokenUrl(mon);
		// 	$floatToken.append(`
		// 		<a href="${imgLink}" target="_blank" rel="noopener">
		// 			<img src="${imgLink}" id="token_image" class="token" onerror="imgError(this)" alt="${mon.name}">
		// 		</a>`
		// 	);
		// } else imgError();
		//
		// // inline rollers //////////////////////////////////////////////////////////////////////////////////////////////
		// const isProfDiceMode = PROF_DICE_MODE === PROF_MODE_DICE;
		// function _addSpacesToDiceExp (exp) {
		// 	return exp.replace(/([^0-9d])/gi, " $1 ").replace(/\s+/g, " ");
		// }
		//
		// // add proficiency dice stuff for attack rolls, since those _generally_ have proficiency
		// // this is not 100% accurate; for example, ghouls don't get their prof bonus on bite attacks
		// // fixing it would probably involve machine learning though; we need an AI to figure it out on-the-fly
		// // (Siri integration forthcoming)
		// $content.find(".render-roller")
		// 	.filter(function () {
		// 		return $(this).text().match(/^([-+])?\d+$/);
		// 	})
		// 	.each(function () {
		// 		const bonus = Number($(this).text());
		// 		const expectedPB = Parser.crToPb(mon.cr);
		//
		// 		// skills and saves can have expertise
		// 		let expert = 1;
		// 		let pB = expectedPB;
		// 		let fromAbility;
		// 		let ability;
		// 		if ($(this).parent().attr("data-mon-save")) {
		// 			const title = $(this).attr("title");
		// 			ability = title.split(" ")[0].trim().toLowerCase().substring(0, 3);
		// 			fromAbility = Parser.getAbilityModNumber(mon[ability]);
		// 			pB = bonus - fromAbility;
		// 			expert = (pB === expectedPB * 2) ? 2 : 1;
		// 		} else if ($(this).parent().attr("data-mon-skill")) {
		// 			const title = $(this).attr("title");
		// 			ability = Parser.skillToAbilityAbv(title.toLowerCase().trim());
		// 			fromAbility = Parser.getAbilityModNumber(mon[ability]);
		// 			pB = bonus - fromAbility;
		// 			expert = (pB === expectedPB * 2) ? 2 : 1;
		// 		}
		// 		const withoutPB = bonus - pB;
		// 		try {
		// 			// if we have proficiency bonus, convert the roller
		// 			if (expectedPB > 0) {
		// 				const profDiceString = _addSpacesToDiceExp(`${expert}d${pB * (3 - expert)}${withoutPB >= 0 ? "+" : ""}${withoutPB}`);
		//
		// 				$(this).attr("data-roll-prof-bonus", $(this).text());
		// 				$(this).attr("data-roll-prof-dice", profDiceString);
		//
		// 				// here be (chromatic) dragons
		// 				const cached = $(this).attr("onclick");
		// 				const nu = `
		// 					(function(it) {
		// 						if (PROF_DICE_MODE === PROF_MODE_DICE) {
		// 							Renderer.dice.rollerClick(event, it, '{"type":"dice","rollable":true,"toRoll":"1d20 + ${profDiceString}"}'${$(this).prop("title") ? `, '${$(this).prop("title")}'` : ""})
		// 						} else {
		// 							${cached.replace(/this/g, "it")}
		// 						}
		// 					})(this)`;
		//
		// 				$(this).attr("onclick", nu);
		//
		// 				if (isProfDiceMode) {
		// 					$(this).html(profDiceString);
		// 				}
		// 			}
		// 		} catch (e) {
		// 			setTimeout(() => {
		// 				throw new Error(`Invalid save or skill roller! Bonus was ${bonus >= 0 ? "+" : ""}${bonus}, but creature's PB was +${expectedPB} and relevant ability score (${ability}) was ${fromAbility >= 0 ? "+" : ""}${fromAbility} (should have been ${expectedPB + fromAbility >= 0 ? "+" : ""}${expectedPB + fromAbility} total)`);
		// 			}, 0);
		// 		}
		// 	});
		//
		// $content.find("p").each(function () {
		// 	$(this).html($(this).html().replace(/DC\s*(\d+)/g, function (match, capture) {
		// 		const dc = Number(capture);
		//
		// 		const expectedPB = Parser.crToPb(mon.cr);
		//
		// 		if (expectedPB > 0) {
		// 			const withoutPB = dc - expectedPB;
		// 			const profDiceString = _addSpacesToDiceExp(`1d${(expectedPB * 2)}${withoutPB >= 0 ? "+" : ""}${withoutPB}`);
		//
		// 			return `DC <span class="dc-roller" mode="${isProfDiceMode ? "dice" : ""}" onmousedown="window.PROF_DICE_MODE === window.PROF_MODE_DICE &&  event.preventDefault()" onclick="dcRollerClick(event, this, '${profDiceString}')" data-roll-prof-bonus="${capture}" data-roll-prof-dice="${profDiceString}">${isProfDiceMode ? profDiceString : capture}</span>`;
		// 		} else {
		// 			return match; // if there was no proficiency bonus to work with, fall back on this
		// 		}
		// 	}));
		// });
	}

	function buildFluffTab (isImageTab) {
		return Renderer.utils.buildFluffTab(
			isImageTab,
			$content,
			ship,
			Renderer.sjship.getFluff.bind(null, ship)
		);
	}

	// reset tabs
	const statTab = Renderer.utils.tabButton(
		"Statblock",
		() => {
			$(`#float-token`).show();
		},
		buildStatsTab
	);
	const infoTab = Renderer.utils.tabButton(
		"Info",
		() => {
			$(`#float-token`).hide();
		},
		buildFluffTab
	);
	const picTab = Renderer.utils.tabButton(
		"Images",
		() => {
			$(`#float-token`).hide();
		},
		() => buildFluffTab(true)
	);
	Renderer.utils.bindTabButtons(statTab, infoTab, picTab);
}

function loadsub (sub) {
	// filterBox.setFromSubHashes(sub);
	// ListUtil.setFromSubHashes(sub, sublistFuncPreload);

	// printBookView.handleSub(sub);

	// const scaledHash = sub.find(it => it.startsWith(MON_HASH_SCALED));
	// if (scaledHash) {
	// 	const scaleTo = Number(UrlUtil.unpackSubHash(scaledHash)[MON_HASH_SCALED][0]);
	// 	const scaleToStr = Parser.numberToCr(scaleTo);
	// 	const mon = monsters[History.lastLoadedId];
	// 	if (Parser.isValidCr(scaleToStr) && scaleTo !== Parser.crToNumber(lastRendered.mon.cr)) {
	// 		ScaleCreature.scale(mon, scaleTo).then(scaled => renderStatblock(scaled, true));
	// 	}
	// }
	//
	// encounterBuilder.handleSubhash(sub);
}
