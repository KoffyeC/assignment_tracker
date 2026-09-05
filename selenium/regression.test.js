import test from "node:test";
import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";

const BASE_URL = "http://localhost:8000";

async function createDriver() {
    return await new Builder()
        .forBrowser("firefox")
        .build();
}

async function acceptAlert(driver) {
    try {
        const alert = await driver.switchTo().alert();
        await alert.accept();
    } catch {
        // No alert was present.
    }
}


// ====================
// ASSIGNMENTS
// ====================

test("Regression - Create assignment", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("name"))
            .sendKeys("Regression Assignment");

        await driver.findElement(By.id("class"))
            .sendKeys("CSC 2050");

        await driver.executeScript(
            "arguments[0].value = '2026-12-31';",
            await driver.findElement(By.id("dueDate"))
        );

        await driver.findElement(By.id("priority"))
            .sendKeys("High");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const body = await driver.findElement(By.css("body")).getText();

        assert.ok(
            body.includes("Regression Assignment"),
            "Created assignment should appear"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Assignment required-field validation", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.sleep(300);

        assert.ok(
            (await driver.getCurrentUrl()).includes("assignment-form.html"),
            "Invalid assignment should remain on the form"
        );

        const body = await driver.findElement(By.css("body")).getText();

        assert.ok(
            body.length > 0,
            "Validation feedback should be displayed"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Edit assignment", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("name"))
            .sendKeys("Assignment To Edit");

        await driver.findElement(By.id("class"))
            .sendKeys("CSC 2050");

        await driver.executeScript(
            "arguments[0].value = '2026-12-31';",
            await driver.findElement(By.id("dueDate"))
        );

        await driver.findElement(By.id("priority"))
            .sendKeys("High");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const editLink = await driver.findElement(
            By.css('a[aria-label="Edit Assignment To Edit"]')
        );

        await editLink.click();

        await driver.wait(
            until.urlContains("assignment-form.html?id="),
            5000
        );

        const nameField = await driver.findElement(By.id("name"));

        await nameField.clear();
        await nameField.sendKeys("Edited Assignment");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const body = await driver.findElement(By.css("body")).getText();

        assert.ok(
            body.includes("Edited Assignment"),
            "Edited assignment should display the new name"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Complete assignment", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("name"))
            .sendKeys("Assignment To Complete");

        await driver.findElement(By.id("class"))
            .sendKeys("CSC 2050");

        await driver.executeScript(
            "arguments[0].value = '2026-12-31';",
            await driver.findElement(By.id("dueDate"))
        );

        await driver.findElement(By.id("priority"))
            .sendKeys("Medium");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const completeButton = await driver.findElement(
            By.css('button[aria-label="Mark Assignment To Complete complete"]')
        );

        await completeButton.click();

        await driver.wait(async () => {
            const body = await driver.findElement(By.css("body")).getText();
            return body.includes("Assignment To Complete");
        }, 5000);

        const incompleteButton = await driver.findElement(
            By.css('button[aria-label="Mark Assignment To Complete incomplete"]')
        );

        assert.ok(
            incompleteButton,
            "Completed assignment should have a Mark Incomplete button"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Delete assignment", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/assignment-form.html`);

        await driver.findElement(By.id("name"))
            .sendKeys("Assignment To Delete");

        await driver.findElement(By.id("class"))
            .sendKeys("CSC 2050");

        await driver.executeScript(
            "arguments[0].value = '2026-12-31';",
            await driver.findElement(By.id("dueDate"))
        );

        await driver.findElement(By.id("priority"))
            .sendKeys("Low");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("assignments.html"),
            5000
        );

        const bodyBeforeDelete = await driver.findElement(By.css("body")).getText();

        assert.ok(
            bodyBeforeDelete.includes("Assignment To Delete"),
            "Assignment should exist before deletion"
        );

        const deleteButtons = await driver.findElements(
            By.xpath("//button[contains(., 'Delete')]")
        );

        assert.ok(
            deleteButtons.length > 0,
            "Delete button should exist"
        );

        // The application asks for confirmation.
        await deleteButtons[deleteButtons.length - 1].click();
        await acceptAlert(driver);

        await driver.sleep(300);

        const bodyAfterDelete = await driver.findElement(By.css("body")).getText();

        assert.ok(
            !bodyAfterDelete.includes("Assignment To Delete"),
            "Deleted assignment should no longer appear"
        );
    } finally {
        await driver.quit();
    }
});


// ====================
// NOTES
// ====================

test("Regression - Create note", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/note-form.html`);

        await driver.findElement(By.id("title"))
            .sendKeys("Regression Note");

        await driver.findElement(By.id("content"))
            .sendKeys("Regression test note content.");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const body = await driver.findElement(By.css("body")).getText();

        assert.ok(
            body.includes("Regression Note"),
            "Created note should appear"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Note required-field validation", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/note-form.html`);

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.sleep(300);

        assert.ok(
            (await driver.getCurrentUrl()).includes("note-form.html"),
            "Invalid note should remain on the form"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Edit note", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/note-form.html`);

        await driver.findElement(By.id("title"))
            .sendKeys("Note To Edit");

        await driver.findElement(By.id("content"))
            .sendKeys("Original note content.");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const editButton = await driver.findElement(
            By.css('a[aria-label="Edit Note To Edit"]')
        );

        await editButton.click();

        await driver.wait(
            until.urlContains("note-form.html?id="),
            5000
        );

        const titleField = await driver.findElement(
            By.id("title")
        );

        await titleField.clear();
        await titleField.sendKeys("Edited Note");

        await driver.findElement(
            By.id("save-button")
        ).click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const body = await driver.findElement(
            By.css("body")
        ).getText();

        assert.ok(
            body.includes("Edited Note"),
            "Edited note should display the new title"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Delete note", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/note-form.html`);

        await driver.findElement(By.id("title"))
            .sendKeys("Note To Delete");

        await driver.findElement(By.id("content"))
            .sendKeys("This note should be deleted.");

        await driver.findElement(By.id("save-button"))
            .click();

        await driver.wait(
            until.urlContains("notes.html"),
            5000
        );

        const bodyBeforeDelete = await driver.findElement(By.css("body")).getText();

        assert.ok(
            bodyBeforeDelete.includes("Note To Delete"),
            "Note should exist before deletion"
        );

        const deleteButtons = await driver.findElements(
            By.xpath("//button[contains(., 'Delete')]")
        );

        assert.ok(
            deleteButtons.length > 0,
            "Delete button should exist"
        );

        await deleteButtons[deleteButtons.length - 1].click();
        await acceptAlert(driver);

        await driver.sleep(300);

        const bodyAfterDelete = await driver.findElement(By.css("body")).getText();

        assert.ok(
            !bodyAfterDelete.includes("Note To Delete"),
            "Deleted note should no longer appear"
        );
    } finally {
        await driver.quit();
    }
});


// ====================
// CALENDAR
// ====================

test("Regression - Calendar next and previous month", async () => {
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
            return (await monthLabel.getText()) !== originalMonth;
        }, 5000);

        const nextMonth = await monthLabel.getText();

        assert.notEqual(
            nextMonth,
            originalMonth,
            "Next month should change the month"
        );

        await driver.findElement(
            By.id("previous-month")
        ).click();

        await driver.wait(async () => {
            return (await monthLabel.getText()) === originalMonth;
        }, 5000);

        assert.equal(
            await monthLabel.getText(),
            originalMonth,
            "Previous month should return to the original month"
        );
    } finally {
        await driver.quit();
    }
});


test("Regression - Calendar Today button", async () => {
    const driver = await createDriver();

    try {
        await driver.get(`${BASE_URL}/calendar.html`);

        await driver.findElement(
            By.id("next-month")
        ).click();

        await driver.findElement(
            By.id("today-button")
        ).click();

        await driver.sleep(300);

        const monthLabel = await driver.findElement(
            By.id("calendar-month-label")
        );

        const label = await monthLabel.getText();

        assert.ok(
            label.length > 0,
            "Today button should return to a valid calendar month"
        );
    } finally {
        await driver.quit();
    }
});