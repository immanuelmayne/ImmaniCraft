const plans = [
  {
    id: "immanicraft-2-0",
    name: "ImmaniCraft-2.0",
    price: "$10",
    cadence: "/month",
    description: "A simple starter pack for players who want a clean world, core tools, and room to build.",
    features: ["Starter server access", "Basic world templates", "Community support"],
  },
  {
    id: "immanicraft-pro",
    name: "ImmaniCraft-Pro",
    price: "$20",
    cadence: "/month",
    description: "Built for serious creators who need more power, more storage, and more ways to shape their world.",
    features: ["Everything in 2.0", "Expanded build zones", "Priority support"],
    popular: true,
  },
  {
    id: "immanicraft-4-0",
    name: "ImmaniCraft-4.0",
    price: "$40",
    cadence: "/month",
    description: "The high-performance plan for advanced players, teams, and larger creative projects.",
    features: ["Everything in Pro", "Advanced automation tools", "Large-scale multiplayer hosting"],
  },
  {
    id: "immanicraft-max",
    name: "ImmaniCraft-Max",
    price: "Custom",
    cadence: "",
    description: "The biggest ImmaniCraft experience yet, designed for elite builders, events, and custom world-scale ambitions.",
    features: ["Unlimited vision planning", "White-glove setup", "Custom features and launch support"],
  },
];

const plansRoot = document.getElementById("plans");
const spotlightName = document.getElementById("spotlight-name");
const spotlightPrice = document.getElementById("spotlight-price");
const spotlightDescription = document.getElementById("spotlight-description");
const spotlightFeatures = document.getElementById("spotlight-features");
const ctaButton = document.getElementById("cta-button");

let selectedPlanId = plans[0].id;

function getPlanMarkup(plan) {
  return `
    <article class="plan-card ${plan.popular ? "popular" : ""} ${
      plan.id === selectedPlanId ? "selected" : ""
    }" data-plan-id="${plan.id}">
      <h2 class="plan-name">${plan.name}</h2>
      <p class="plan-price">${plan.price}${plan.cadence ? `<span>${plan.cadence}</span>` : ""}</p>
      <p class="plan-copy">${plan.description}</p>
      <button class="plan-button" type="button">View Plan</button>
    </article>
  `;
}

function renderPlans() {
  plansRoot.innerHTML = plans.map(getPlanMarkup).join("");

  plansRoot.querySelectorAll(".plan-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedPlanId = card.dataset.planId;
      renderPlans();
      renderSpotlight();
    });
  });
}

function renderSpotlight() {
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  spotlightName.textContent = selectedPlan.name;
  spotlightPrice.textContent = `${selectedPlan.price}${selectedPlan.cadence}`;
  spotlightDescription.textContent = selectedPlan.description;
  spotlightFeatures.innerHTML = selectedPlan.features.map((feature) => `<li>${feature}</li>`).join("");
  ctaButton.textContent =
    selectedPlan.id === "immanicraft-max" ? "Contact for ImmaniCraft-Max" : `Choose ${selectedPlan.name}`;
}

renderPlans();
renderSpotlight();
