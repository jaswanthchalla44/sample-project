import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NoteForm from "./NoteForm";

function renderForm(onSubmit: (input: { title: string; body: string }) => Promise<void>) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NoteForm submitLabel="Save note" cancelTo="/notes" onSubmit={onSubmit} />
    </MemoryRouter>,
  );
}

describe("NoteForm", () => {
  it("blocks submit when the title is empty", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a title.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a trimmed title and the body", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText("Title"), "  Hello  ");
    await userEvent.type(screen.getByLabelText(/Body/), "Some **text**");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: "Hello", body: "Some **text**" }));
  });

  it("disables Save while saving and shows the server error on failure", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Title is too long"));
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText("Title"), "Note");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Title is too long");
    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
  });
});
