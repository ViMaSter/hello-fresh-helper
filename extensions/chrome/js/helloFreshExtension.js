{
	let checkForReadyUnselected, checkForReadySelected = null;

	var oldHref = document.location.href;
	window.onload = function() {
		var bodyList = document.querySelector("body")

		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
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

	const classKey = `hfh-${new Date().toISOString().replace(/\W/g, "-")}`;

	const setupTimeouts = () =>
	{
		checkForReadyUnselected = setInterval(() => {
			if (document.querySelector("[data-test-id=lazy-load-courses]") && !document.querySelector("[data-test-id=lazy-load-courses] [data-test-id=loading-placeholder]"))
			{
				clearInterval(checkForReadyUnselected);
				initUnselected();
			}
		}, 500);
		
		checkForReadySelected = setInterval(() => {
			if (Array.from(document.querySelectorAll("[data-test-id=selected-section-wrapper] [data-test-wrapper-id=recipe-component]")).length > 0)
			{
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

	const toPromiseOfRecipeContent = async ({element, recipe}) =>
	{
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
	const orderFoodsBy = nutritionIDs.proteins;
	const orderBy = DESC;

	const toTwoDecimals = (num) => Math.round(num * 100) / 100;

	const updateElement = ({element, recipe}) =>
	{
		const container = element.querySelector("[data-test-id=recipe-card-title-description-block]");
		let nutritionHTML = document.createElement("div");
		nutritionHTML.classList.add(classKey);
		const existingContainer = container.querySelector("."+classKey);
		if (existingContainer)
		{
			nutritionHTML = existingContainer;
		}

		const selectedNutritionInfo = recipe.nutrition.find(nutrition=>nutrition.type == orderFoodsBy);
		const kcals = recipe.nutrition.find(nutrition=>nutrition.type == nutritionIDs.kcal);
		const nutritionPerCalories = toTwoDecimals((selectedNutritionInfo.amount / kcals.amount) * 100);
		nutritionHTML.innerHTML = `${selectedNutritionInfo.name}: ${nutritionPerCalories} per 100kcal (${selectedNutritionInfo.amount}${selectedNutritionInfo.unit} @ ${kcals.amount}${kcals.unit})`;
		if (!existingContainer)
		{
			container.insertBefore(nutritionHTML, container.querySelector("div:nth-child(3)"));
		}

		const orderAmount = nutritionPerCalories * 100;

		element.style.order = -orderAmount;
		if (orderBy == ASC)
		{
			element.style.order = orderAmount;
		}
	}

	const initUnselected = async () => {
		const nextData = JSON.parse(document.querySelector("#__NEXT_DATA__").innerHTML);
		authorizationHeader = `${nextData.props.pageProps.ssrPayload.serverAuth.token_type} ${nextData.props.pageProps.ssrPayload.serverAuth.access_token}`;
		mealsThisWeek = Array.from(document.querySelectorAll("[data-test-id=filtered-courses] [data-test-id=course-card]")).map(elementToRecipeID).map(toPromiseOfRecipeContent);
		if (mealsThisWeek.length < 0)
		{
			throw new Error("did you scroll to the recipe list?");
		}
		mealsThisWeek = await Promise.all(mealsThisWeek);
		for (entry of mealsThisWeek)
		{
			updateElement(entry);
		}
	};

	const initSelected = async () => {
		const nextData = JSON.parse(document.querySelector("#__NEXT_DATA__").innerHTML);
		authorizationHeader = `${nextData.props.pageProps.ssrPayload.serverAuth.token_type} ${nextData.props.pageProps.ssrPayload.serverAuth.access_token}`;
		mealsThisWeek = Array.from(document.querySelectorAll("[data-test-id=selected-section-wrapper] [data-test-wrapper-id=recipe-component]")).map(elem=>elem.parentElement).map(elementToRecipeID).map(toPromiseOfRecipeContent);
		if (mealsThisWeek.length < 0)
		{
			throw new Error("did you scroll to the recipe list?");
		}
		mealsThisWeek = await Promise.all(mealsThisWeek);
		for (entry of mealsThisWeek)
		{
			updateElement(entry);
		}
	};

	setupTimeouts();
}
