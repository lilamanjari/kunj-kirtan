// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import DateTimePicker from "./DateTimePicker";

afterEach(cleanup);
function Harness() {
  const [value, setValue] = useState("2026-10-26T09:30");
  return <><DateTimePicker label="Start at" value={value} onChange={setValue} /><output>{value}</output></>;
}

describe("feature date and time picker", () => {
  it("changes the day without losing the selected local time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start at" }));
    fireEvent.click(screen.getByRole("button", { name: new Date(2026, 9, 28).toLocaleDateString(undefined, { dateStyle: "full" }) }));
    expect(screen.getByText("2026-10-28T09:30")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Start at time"), { target: { value: "18:45" } });
    expect(screen.getByText("2026-10-28T18:45")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("supports month navigation, arrow keys and Escape", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start at" }));
    const selected = screen.getByRole("button", { name: new Date(2026, 9, 26).toLocaleDateString(undefined, { dateStyle: "full" }) });
    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(screen.getByText("2026-10-27T09:30")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText(new Date(2026, 10, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }))).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
