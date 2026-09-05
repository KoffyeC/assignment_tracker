import test from "node:test";
import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";

const BASE_URL = "http://localhost:8000";

async function createDriver() {
    return await new Builder()
        .forBrowser("firefox")
        .build();
}

test("Smoke test - Dashboard loads", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const title = await driver.getTitle();

        assert.equal(
            title,
            "Dashboard · Student Planner",
            "Dashboard should load with the correct title"
        );

        const heading = await driver.findElement(By.css("h1"));

        assert.equal(
            await heading.getText(),
            "Dashboard",
            "Dashboard heading should be present"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Navigate to Assignments", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const assignmentsLink = await driver.findElement(
            By.css('a[href="assignments.html"]')
        );

        await assignmentsLink.click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const heading = await driver.findElement(By.css("h1"));

        assert.equal(
            await heading.getText(),
            "My Assignments",
            "Assignments page should load correctly"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Navigate to Notes", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const notesLink = await driver.findElement(
            By.css('a[href="notes.html"]')
        );

        await notesLink.click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const heading = await driver.findElement(By.css("h1"));

        assert.equal(
            await heading.getText(),
            "My Notes",
            "Notes page should load correctly"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Navigate to Calendar", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const calendarLink = await driver.findElement(
            By.css('a[href="calendar.html"]')
        );

        await calendarLink.click();

        await driver.wait(
            until.urlContains("calendar.html"),
            5000
        );

        const heading = await driver.findElement(By.css("h1"));

        assert.equal(
            await heading.getText(),
            "Calendar",
            "Calendar page should load correctly"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Navigate to Settings", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const settingsLink = await driver.findElement(
            By.css('a[href="settings.html"]')
        );

        await settingsLink.click();

        await driver.wait(
            until.urlContains("settings.html"),
            5000
        );

        const heading = await driver.findElement(By.css("h1"));

        assert.equal(
            await heading.getText(),
            "Settings",
            "Settings page should load correctly"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Add an assignment", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("name"))
            .sendKeys("Selenium Smoke Test Assignment");

        await driver.findElement(By.id("class"))
            .sendKeys("CSC 2050");

        const dueDate = await driver.findElement(By.id("dueDate"));

        await driver.executeScript(
            "arguments[0].value = '2026-12-31';",
            dueDate
        );

        await driver.findElement(By.id("priority"))
            .sendKeys("High");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const pageText = await driver.findElement(
            By.css("body")
        ).getText();

        assert.ok(
            pageText.includes("Selenium Smoke Test Assignment"),
            "New assignment should appear in the assignments list"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Add a note", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/note-form.html`);

        await driver.findElement(By.id("title"))
            .sendKeys("Selenium Smoke Test Note");

        await driver.findElement(By.id("content"))
            .sendKeys("This note was created by the Selenium smoke test.");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const pageText = await driver.findElement(
            By.css("body")
        ).getText();

        assert.ok(
            pageText.includes("Selenium Smoke Test Note"),
            "New note should appear in the notes list"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Calendar controls work", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/calendar.html`);

        const monthLabel = await driver.findElement(
            By.id("calendar-month-label")
        );

        const originalMonth = await monthLabel.getText();

        await driver.findElement(
            By.id("next-month")
        ).click();

        await driver.wait(async () => {
            const newMonth = await monthLabel.getText();
            return newMonth !== originalMonth;
        }, 5000);

        const nextMonth = await monthLabel.getText();

        assert.notEqual(
            nextMonth,
            originalMonth,
            "Next month button should change the displayed month"
        );

        await driver.findElement(
            By.id("previous-month")
        ).click();

        await driver.wait(async () => {
            const restoredMonth = await monthLabel.getText();
            return restoredMonth === originalMonth;
        }, 5000);

        assert.equal(
            await monthLabel.getText(),
            originalMonth,
            "Previous month button should return to the original month"
        );
    } finally {
        await driver.quit();
    }
});


test("Smoke test - Logout redirects to login", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/index.html`);

        const logoutButton = await driver.findElement(
            By.id("logout-button")
        );

        await logoutButton.click();

        await driver.wait(
            until.urlContains("login.html"),
            5000
        );

        assert.ok(
            (await driver.getCurrentUrl()).includes("login.html"),
            "Logout should redirect to the login page"
        );
    } finally {
        await driver.quit();
    }
});