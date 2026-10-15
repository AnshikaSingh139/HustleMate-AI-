"use strict";

/* ---------------------------------------
   HUSTLEMATE AI
   Main JavaScript file
---------------------------------------- */

const DEFAULT_ENDPOINT = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "qwen2.5:3b";

let toastTimer;

/* ---------------------------------------
   DOM HELPERS
---------------------------------------- */

function $(id) {
    return document.getElementById(id);
}

function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function setStatus(message, connected = false) {
    $("connection-status").textContent = message;

    const dot = document.querySelector(".status-dot");

    dot.style.background = connected ? "#25a879" : "#c3c5d1";
}

function getOutputText(elementId) {
    const element = $(elementId);

    return element.innerText.trim();
}

function showOutput(elementId, text) {
    const output = $(elementId);

    // textContent prevents generated text from being interpreted as HTML.
    output.textContent = text;
}

function setLoading(button, isLoading, loadingText = "Generating...") {
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "Generate";
    }
}

function getSettings() {
    return {
        endpoint: localStorage.getItem("hustlemate_endpoint") || DEFAULT_ENDPOINT,
        model: localStorage.getItem("hustlemate_model") || DEFAULT_MODEL
    };
}

/* ---------------------------------------
   NAVIGATION
---------------------------------------- */

const pageHeadings = {
    dashboard: "Your hustle starts here.",
    content: "Create content that connects.",
    product: "Make your products stand out.",
    pricing: "Price with a plan.",
    proposal: "Pitch your next big idea.",
    settings: "Your AI, your choice."
};

function openPage(pageId) {
    const target = $(pageId);

    if (!target) {
        return;
    }

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    $("page-heading").textContent = pageHeadings[pageId] || "HustleMate AI";

    $("breadcrumb-page").textContent =
        pageId.charAt(0).toUpperCase() + pageId.slice(1);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.go);
    });
});

/* ---------------------------------------
   LOCAL AI CONNECTION
---------------------------------------- */

function validateLocalEndpoint(endpoint) {
    let parsed;

    try {
        parsed = new URL(endpoint);
    } catch {
        throw new Error("Please enter a valid API endpoint URL.");
    }

    const hostname = parsed.hostname.toLowerCase();

    const isLocalHost = [
        "localhost",
        "127.0.0.1",
        "::1",
        "[::1]"
    ].includes(hostname);

    if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
    ) {
        throw new Error("The endpoint must use HTTP or HTTPS.");
    }

    if (!isLocalHost) {
        throw new Error(
            "For this privacy-focused demo, use a localhost Ollama endpoint."
        );
    }

    return parsed.href;
}

async function generateAI(prompt, systemInstruction = "") {
    const settings = getSettings();

    const endpoint = validateLocalEndpoint(settings.endpoint);

    const response = await fetch(endpoint, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            model: settings.model,

            prompt: [
                systemInstruction,
                prompt
            ].filter(Boolean).join("\n\n"),

            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(
            `AI request failed with status ${response.status}.`
        );
    }

    const data = await response.json();

    if (!data.response || !data.response.trim()) {
        throw new Error(
            "The model returned an empty response. Try again."
        );
    }

    setStatus("Local AI connected", true);

    return data.response.trim();
}

async function handleAIError(error) {
    console.error("HustleMate AI error:", error);

    if (
        error.name === "TypeError" ||
        error.message.toLowerCase().includes("fetch")
    ) {
        setStatus("Connection unavailable", false);

        showToast(
            "Cannot reach Ollama. Check that it is running and that browser access is configured."
        );

        return;
    }

    showToast(error.message || "Something went wrong. Please try again.");
}

/* ---------------------------------------
   CONTENT WRITER
---------------------------------------- */

$("content-form").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');

    const contentType = $("content-type").value;
    const topic = $("content-topic").value.trim();
    const tone = $("content-tone").value;
    const audience = $("content-audience").value.trim() || "General audience";

    if (!topic) {
        showToast("Please describe what your content is about.");
        return;
    }

    const prompt = `
Create a ${contentType} about the following topic:

${topic}

Target audience: ${audience}
Tone: ${tone}

Requirements:
- Write original, useful content.
- Make it appropriate for the selected platform.
- Use clear language.
- Avoid unsupported claims.
- Do not invent customer reviews or testimonials.
- Return the finished draft only.
`;

    setLoading(button, true, "Creating draft...");

    showOutput("content-output", "Your content is being generated...");

    try {
        const result = await generateAI(
            prompt,
            "You are a helpful writing assistant for independent creators and small businesses."
        );

        showOutput("content-output", result);

        showToast("Your content draft is ready.");
    } catch (error) {
        showOutput(
            "content-output",
            "Content could not be generated.\n\n" +
            "Please check your local AI settings and try again.\n\n" +
            error.message
        );

        await handleAIError(error);
    } finally {
        setLoading(button, false);
    }
});

/* ---------------------------------------
   PRODUCT LISTING GENERATOR
---------------------------------------- */

$("product-form").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');

    const name = $("product-name").value.trim();
    const features = $("product-features").value.trim();
    const audience = $("product-audience").value.trim() || "General customers";
    const platform = $("product-platform").value;

    if (!name || !features) {
        showToast("Please enter the product name and its key features.");
        return;
    }

    const prompt = `
Create a product listing for ${platform}.

Product name:
${name}

Known product features:
${features}

Target audience:
${audience}

Return:
1. A clear product title.
2. A concise product description.
3. Five useful selling points.
4. A short call to action.

Important:
- Only use the product facts supplied by the user.
- Do not invent certifications, guarantees, ratings, or technical specifications.
- Do not make unsupported health or performance claims.
- Keep the language engaging and easy to understand.
`;

    setLoading(button, true, "Creating listing...");

    showOutput("product-output", "Your product listing is being generated...");

    try {
        const result = await generateAI(
            prompt,
            "You are an e-commerce copywriting assistant. Be persuasive but truthful."
        );

        showOutput("product-output", result);

        showToast("Product listing created.");
    } catch (error) {
        showOutput(
            "product-output",
            "The product listing could not be generated.\n\n" +
            "Please check your local AI connection and try again.\n\n" +
            error.message
        );

        await handleAIError(error);
    } finally {
        setLoading(button, false);
    }
});

/* ---------------------------------------
   PRICING CALCULATOR
---------------------------------------- */

$("pricing-form").addEventListener("submit", event => {
    event.preventDefault();

    const cost = Number($("cost").value);
    const packaging = Number($("packaging").value);
    const feesPercent = Number($("fees").value);
    const marginPercent = Number($("margin").value);

    const values = [
        cost,
        packaging,
        feesPercent,
        marginPercent
    ];

    if (values.some(value => !Number.isFinite(value) || value < 0)) {
        showToast("Please enter valid, non-negative numbers.");
        return;
    }

    if (feesPercent >= 100 || marginPercent >= 100) {
        showToast("Fees must be below 100%, and margin must be below 100%.");
        return;
    }

    const totalCost = cost + packaging;

    /*
       Let:
       P = selling price
       C = total cost
       F = fee rate
       M = target profit margin

       Profit = P - C - (P * F)

       Target margin:
       Profit / P = M

       Therefore:
       P = C / (1 - F - M)
    */

    const feeRate = feesPercent / 100;
    const marginRate = marginPercent / 100;

    const denominator = 1 - feeRate - marginRate;

    if (denominator <= 0) {
        showToast(
            "The target margin and fees leave no room for a valid selling price."
        );
        return;
    }

    const sellingPrice = totalCost / denominator;
    const estimatedFees = sellingPrice * feeRate;
    const estimatedProfit = sellingPrice - totalCost - estimatedFees;

    const actualMargin = sellingPrice > 0
        ? (estimatedProfit / sellingPrice) * 100
        : 0;

    $("selling-price").textContent = sellingPrice.toFixed(2);

    $("total-cost").textContent =
        "₹" + totalCost.toFixed(2);

    $("estimated-fees").textContent =
        "₹" + estimatedFees.toFixed(2);

    $("estimated-profit").textContent =
        "₹" + estimatedProfit.toFixed(2);

    $("actual-margin").textContent =
        actualMargin.toFixed(1) + "%";

    showToast("Pricing estimate calculated.");
});

/* ---------------------------------------
   CLIENT PROPOSAL GENERATOR
---------------------------------------- */

$("proposal-form").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');

    const client = $("client-name").value.trim();
    const service = $("service-name").value.trim();
    const details = $("project-details").value.trim();
    const budget = $("project-budget").value.trim();
    const timeline = $("project-timeline").value.trim();

    if (!client || !service || !details) {
        showToast("Please complete the required project details.");
        return;
    }

    const prompt = `
Draft a professional freelance project proposal.

Client or business:
${client}

Service offered:
${service}

Project requirements:
${details}

Proposed budget:
${budget ? "₹" + budget : "To be discussed"}

Estimated timeline:
${timeline || "To be agreed with the client"}

Include:
1. A suitable proposal title.
2. A short introduction.
3. Understanding of the client's requirements.
4. Proposed approach and deliverables.
5. Estimated timeline and budget, when provided.
6. A polite next step.

Important:
- Do not invent previous client experience.
- Do not promise guaranteed business results.
- Clearly identify estimates as estimates.
- Use a professional and friendly tone.
- Return a complete draft that the freelancer can personalize.
`;

    setLoading(button, true, "Drafting proposal...");

    showOutput("proposal-output", "Your proposal is being drafted...");

    try {
        const result = await generateAI(
            prompt,
            "You are a professional freelance proposal writing assistant."
        );

        showOutput("proposal-output", result);

        showToast("Proposal draft created.");
    } catch (error) {
        showOutput(
            "proposal-output",
            "The proposal could not be generated.\n\n" +
            "Please check your local AI connection and try again.\n\n" +
            error.message
        );

        await handleAIError(error);
    } finally {
        setLoading(button, false);
    }
});

/* ---------------------------------------
   SAVE AI SETTINGS
---------------------------------------- */

$("settings-form").addEventListener("submit", event => {
    event.preventDefault();

    const endpoint = $("ai-endpoint").value.trim();
    const model = $("ai-model").value.trim();

    if (!model) {
        showToast("Please enter a model name.");
        return;
    }

    try {
        const safeEndpoint = validateLocalEndpoint(endpoint);

        localStorage.setItem("hustlemate_endpoint", safeEndpoint);
        localStorage.setItem("hustlemate_model", model);

        $("settings-message").textContent =
            "Settings saved in this browser.";

        $("settings-message").style.color = "#21865f";

        showToast("AI settings saved.");
    } catch (error) {
        $("settings-message").textContent = error.message;
        $("settings-message").style.color = "#c44c4c";
    }
});

/* ---------------------------------------
   TEST AI CONNECTION
---------------------------------------- */

$("test-ai").addEventListener("click", async event => {
    const button = event.currentTarget;

    setLoading(button, true, "Testing...");

    $("settings-message").textContent = "Checking the local AI connection...";

    try {
        const result = await generateAI(
            "Reply with exactly: HustleMate connection successful.",
            "You are a concise assistant."
        );

        $("settings-message").textContent =
            "Connection successful. Model response: " + result;

        $("settings-message").style.color = "#21865f";

        setStatus("Local AI connected", true);

        showToast("Local AI connection successful.");
    } catch (error) {
        $("settings-message").textContent =
            "Connection failed: " + error.message;

        $("settings-message").style.color = "#c44c4c";

        await handleAIError(error);
    } finally {
        setLoading(button, false);
    }
});

/* ---------------------------------------
   COPY GENERATED TEXT
---------------------------------------- */

document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
        const elementId = button.dataset.copy;
        const text = getOutputText(elementId);

        if (!text) {
            showToast("There is no text to copy yet.");
            return;
        }

        if (text.startsWith("Your ") && text.includes("being generated")) {
            showToast("Please wait for generation to finish.");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);

            showToast("Text copied to clipboard.");
        } catch {
            /*
               Clipboard access can require HTTPS or localhost.
               Use a temporary textarea as a fallback.
            */

            const textarea = document.createElement("textarea");

            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.select();

            const successful = document.execCommand("copy");

            textarea.remove();

            if (successful) {
                showToast("Text copied to clipboard.");
            } else {
                showToast("Copy failed. Select and copy the text manually.");
            }
        }
    });
});

/* ---------------------------------------
   DOWNLOAD GENERATED TEXT
---------------------------------------- */

document.querySelectorAll("[data-download]").forEach(button => {
    button.addEventListener("click", () => {
        const elementId = button.dataset.download;
        const text = getOutputText(elementId);

        if (!text) {
            showToast("There is no text to download yet.");
            return;
        }

        const blob = new Blob(
            [text],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${elementId}-draft.txt`;

        document.body.appendChild(link);

        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast("Your text file has been downloaded.");
    });
});

/* ---------------------------------------
   INITIALIZATION
---------------------------------------- */

function initializeSettings() {
    const settings = getSettings();

    $("ai-endpoint").value = settings.endpoint;
    $("ai-model").value = settings.model;
}

initializeSettings();

setStatus("Local AI not checked", false);

console.log("HustleMate AI is ready.");