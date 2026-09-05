import { test } from "node:test";
import assert from "node:assert/strict";
import { Builder, By} from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
const BASE_URL = "http://localhost:8000";

async function createDriver() {
    return new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(new firefox.Options())
        .build();
}

test("Large dataset - 500 assignments", async () => {
    const driver = await createDriver();

    try {
        const totalAssignments = 500;

        await driver.get(`${BASE_URL}/assignments.html`);

        // Generate 500 valid assignments directly in localStorage.
        await driver.executeScript(`
            const assignments = [];

            for (let i = 1; i <= ${totalAssignments}; i++) {
                const timestamp = new Date().toISOString();

                assignments.push({
                    id: "large-test-" + i,
                    name: "Large Dataset Assignment " + i,
                    class: "QA",
                    dueDate: "2026-12-31",
                    priority: "Medium",
                    completed: false,
                    createdAt: timestamp,
                    updatedAt: timestamp
                });
            }

            localStorage.setItem(
                "studentPlanner.assignments.v1",
                JSON.stringify(assignments)
            );
        `);

        // Reload so the application reads the seeded localStorage data.
        await driver.navigate().refresh();

        // Verify all 500 assignments are rendered.
        const assignments = await driver.findElements(
            By.css(".assignment-row")
        );

        assert.equal(
            assignments.length,
            totalAssignments,
            `Expected ${totalAssignments} assignments, found ${assignments.length}`
        );

        // Verify the page still displays assignment information correctly.
        const firstAssignment = await assignments[0]
            .findElement(By.css(".assignment-row__name"))
            .getText();

        assert.ok(
            firstAssignment.includes("Large Dataset Assignment"),
            "Assignments should display correctly with a large dataset"
        );

        // Verify persistence after another refresh.
        await driver.navigate().refresh();

        const assignmentsAfterRefresh = await driver.findElements(
            By.css(".assignment-row")
        );

        assert.equal(
            assignmentsAfterRefresh.length,
            totalAssignments,
            "All assignments should persist after refresh"
        );

    } finally {
        // Clean up the test data so it doesn't affect other tests.
        await driver.executeScript(`
            localStorage.removeItem("studentPlanner.assignments.v1");
        `);

        await driver.quit();
    }
});