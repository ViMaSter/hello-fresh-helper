{
	let checkForReadyUnselected, checkForReadySelected = null;

	var oldHref = document.location.href;
	window.onload = function () {
		var bodyList = document.querySelector("body")

		var observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (oldHref != document.location.href) {
					oldHref = document.location.href;
					clearInterval(checkForReadyUnselected);
					clearInterval(checkForReadySelected);
					setupTimeouts();
				}
			});
		});

		var config = {
			childList: true,
			subtree: true
		};

		observer.observe(bodyList, config);
	};

	chrome.storage.onChanged.addListener(function (changes, namespace) {
		for (let [key, { newValue }] of Object.entries(changes)) {
			if (namespace != "sync") {
				return;
			}

			if (key == "field") {
				orderFoodsBy = newValue;
				initUnselected();
				initSelected();
				return;
			}
			if (key == "order") {
				orderBy = newValue;
				initUnselected();
				initSelected();
				return;
			}
		}
	});

	const classKey = `hfh-${new Date().toISOString().replace(/\W/g, "-")}`;

	const setupTimeouts = () => {
		checkForReadyUnselected = setInterval(() => {
			if (document.querySelector("[data-test-id=lazy-load-courses]") && !document.querySelector("[data-test-id=lazy-load-courses] [data-test-id=loading-placeholder]")) {
				clearInterval(checkForReadyUnselected);
				initUnselected();
			}
		}, 500);

		checkForReadySelected = setInterval(() => {
			if (Array.from(document.querySelectorAll("[data-test-id=selected-section-wrapper] [data-test-wrapper-id=recipe-component]")).length > 0) {
				clearInterval(checkForReadySelected);
				initSelected();
			}
		}, 500);
	};

	let authorizationHeader = null;
	const makeRequest = (method, url) => {
		return new Promise(function (resolve, reject) {
			let xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.setRequestHeader("Authorization", authorizationHeader)
			xhr.onload = function () {
				if (this.status >= 200 && this.status < 300) {
					resolve(xhr.response);
				} else {
					reject({
						status: this.status,
						statusText: xhr.statusText
					});
				}
			};
			xhr.onerror = function () {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			};
			xhr.send();
		});
	};

	let mealsThisWeek = [];
	const elementToRecipeID = (element) => {
		return {
			element,
			recipe: getRecipeByID(element.querySelector("[data-test-id*=recipe]").attributes["data-recipe-id"].value)
		};
	};

	const getRecipeByID = async (recipeID) => {
		const url = `https://www.hellofresh.de/gw/recipes/recipes/${recipeID}?recipeId=${recipeID}&country=de&locale=de-DE`;
		const data = await makeRequest("GET", url);
		return data;
	}

	const toPromiseOfRecipeContent = async ({ element, recipe }) => {
		return {
			element,
			recipe: JSON.parse(await recipe)
		};
	}

	const nutritionIDs = {
		kcal: "57b42a48b7e8697d4b305304",
		carbs: "57b42a48b7e8697d4b305305",
		proteins: "57b42a48b7e8697d4b305309"
	};

	const ASC = "ASC";
	const DESC = "DESC";
	let orderFoodsBy = nutritionIDs.proteins;
	let orderBy = DESC;

	const toTwoDecimals = (num) => Math.round(num * 100) / 100;

	const updateElement = ({ element, recipe }, goUpOneElement) => {
		const container = element.querySelector("[data-test-id=recipe-card-title-description-block]");
		let nutritionHTML = document.createElement("div");
		nutritionHTML.classList.add(classKey);
		const existingContainer = container.querySelector("." + classKey);
		if (existingContainer) {
			nutritionHTML = existingContainer;
		}

		const selectedNutritionInfo = recipe.nutrition.find(nutrition => nutrition.type == orderFoodsBy);
		const kcals = recipe.nutrition.find(nutrition => nutrition.type == nutritionIDs.kcal);
		const nutritionPerCalories = toTwoDecimals((selectedNutritionInfo.amount / kcals.amount) * 100);
		if (selectedNutritionInfo.type == nutritionIDs.kcal)
		{
			nutritionHTML.innerHTML = `${selectedNutritionInfo.name}: ${selectedNutritionInfo.amount}${selectedNutritionInfo.unit}`;
		}
		else
		{
			nutritionHTML.innerHTML = `${selectedNutritionInfo.name}: ${nutritionPerCalories} per 100kcal (${selectedNutritionInfo.amount}${selectedNutritionInfo.unit} @ ${kcals.amount}${kcals.unit})`;
		}
		if (!existingContainer) {
			container.insertBefore(nutritionHTML, container.querySelector("div:nth-child(3)"));
		}

		const linkContainer = document.createElement("a");
		linkContainer.innerHTML = `<div style="display: inline" class="web-3205mz"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#067A46" fill-rule="evenodd" d="M14 20v-4.5c-.695 0-1.362.034-2 .099-3.381.34-5.96 1.526-7.734 2.917C3.244 19.316 2.489 20.185 2 21c0-1.34.178-2.54.491-3.613C4.746 9.657 14 8.5 14 8.5V4l8 8.004L14 20zm2-4.826l3.172-3.17L16 8.83v1.436l-1.746.218-.011.001a9.638 9.638 0 00-.384.065c-.282.054-.696.144-1.199.283-1.012.281-2.341.755-3.652 1.52-1.216.709-2.4 1.652-3.312 2.935C7.918 14.21 10.698 13.5 14 13.5h2v1.674z" clip-rule="evenodd"></path></svg></div>`;
		linkContainer.href = `https://www.hellofresh.de/recipes/item-${recipe.id}`;
		nutritionHTML.appendChild(linkContainer);

		var ellipsis = nutritionHTML.parentElement.querySelector("[data-test-id=ellipsis-container]");
		if (ellipsis)
		{
			ellipsis.remove();
		}

		const orderAmount = selectedNutritionInfo.type == nutritionIDs.kcal ? Math.round(selectedNutritionInfo.amount) :  Math.round(nutritionPerCalories * 100);
		const orderElement = goUpOneElement ? element.parentElement : element;
		orderElement.style.order = -orderAmount;
		if (orderBy == ASC) {
			orderElement.style.order = orderAmount;
		}
	}

	const initUnselected = async () => {
		const nextData = JSON.parse(document.querySelector("#__NEXT_DATA__").innerHTML);
		authorizationHeader = `${nextData.props.pageProps.ssrPayload.serverAuth.token_type} ${nextData.props.pageProps.ssrPayload.serverAuth.access_token}`;
		mealsThisWeek = Array.from(document.querySelectorAll("[data-test-id=filtered-courses] [data-test-id=course-card]")).map(elementToRecipeID).map(toPromiseOfRecipeContent);
		if (mealsThisWeek.length < 0) {
			throw new Error("did you scroll to the recipe list?");
		}
		mealsThisWeek = await Promise.all(mealsThisWeek);
		for (entry of mealsThisWeek) {
			updateElement(entry, false);
		}
	};

	const initSelected = async () => {
		const nextData = JSON.parse(document.querySelector("#__NEXT_DATA__").innerHTML);
		authorizationHeader = `${nextData.props.pageProps.ssrPayload.serverAuth.token_type} ${nextData.props.pageProps.ssrPayload.serverAuth.access_token}`;
		mealsThisWeek = Array.from(document.querySelectorAll("[data-test-id=selected-section-wrapper] [data-test-wrapper-id=recipe-component]")).map(elem => elem.parentElement).map(elementToRecipeID).map(toPromiseOfRecipeContent);
		if (mealsThisWeek.length < 0) {
			throw new Error("did you scroll to the recipe list?");
		}
		mealsThisWeek = await Promise.all(mealsThisWeek);
		for (entry of mealsThisWeek) {
			updateElement(entry, true);
		}
	};

	chrome.storage.sync.get(["field", "order"], (values) => {
		orderFoodsBy = values["field"] || nutritionIDs.kcal;
		orderBy = values["order"] || "DESC";
		setupTimeouts();
	});

}
