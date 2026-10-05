import { useEffect, useRef, useState } from "react";
import type { Guest, GuestCategory, GuestOwner } from "../types";
import { IconChevronRight, IconClose, IconEdit, IconEye, IconEyeOff, IconHeart, IconTrash } from "./Icons";
import { guestNamePlaceholder } from "../textUtils";
import Dropdown from "./Dropdown";

type ContactDetails = { phone: string; email: string; address: string; notes: string };
const emptyContact: ContactDetails = { phone: "", email: "", address: "", notes: "" };

type Props = {
  owner: GuestOwner;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showInviteLink?: boolean;
  deletable?: boolean;
  nameEditable?: boolean;
  onUpdateOwner: (patch: Partial<Pick<GuestOwner, "name">>) => void;
  onDeleteOwner: () => void;
  onAddGuest: (name: string, plusCount: number, categoryId: string, isVip: boolean, contact?: ContactDetails) => void;
  onUpdateGuest: (guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount" | "isVip" | "included" | "phone" | "email" | "address" | "notes">>) => void;
  onDeleteGuest: (guestId: string) => void;
  onAddCategory: (title: string) => void;
  onUpdateCategory: (categoryId: string, title: string) => void;
  onDeleteCategory: (categoryId: string) => void;
};

function attendeeTotal(list: Guest[]) {
  return list.reduce((sum, g) => (g.included === false ? sum : sum + 1 + g.plusCount), 0);
}

type AddFormProps = {
  lists: GuestCategory[];
  defaultListId: string;
  onAddGuest: (name: string, plusCount: number, categoryId: string, isVip: boolean, contact?: ContactDetails) => void;
  onAdded?: (listId: string) => void;
};

// Name, +count, which list to put them in, and — tucked behind an "optional"
// link so the quick-add row stays uncluttered — their contact info.
function GuestAddForm({ lists, defaultListId, onAddGuest, onAdded }: AddFormProps) {
  const [name, setName] = useState("");
  const [count, setCount] = useState("");
  const [targetListId, setTargetListId] = useState(defaultListId);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [contact, setContact] = useState<ContactDetails>(emptyContact);
  const target = lists.find((l) => l.id === targetListId) ?? lists[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target) return;
    const plusCount = count === "" ? 0 : Math.max(0, Math.floor(Number(count)) || 0);
    onAddGuest(name.trim(), plusCount, target.id, false, contact);
    setName("");
    setCount("");
    setContact(emptyContact);
    setShowDetails(false);
    setAddedTo(target.title);
    setTimeout(() => setAddedTo(null), 2500);
    onAdded?.(target.id);
  }

  if (!target) return null;

  return (
    <form className="guest-add-form-block" onSubmit={submit}>
      <div className="guest-add-form">
        <input
          type="text"
          placeholder={guestNamePlaceholder(target.title)}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="plus-input-label">
          +
          <input
            className="plus-input"
            type="number"
            min={0}
            placeholder="0"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        {lists.length > 1 && (
          <label className="guest-add-list-picker">
            <span>List</span>
            <Dropdown
              value={target.id}
              onChange={setTargetListId}
              options={lists.map((l) => ({ value: l.id, label: l.title }))}
            />
          </label>
        )}
        <button className="btn small" type="submit">Add guest</button>
        {addedTo && <span className="guest-added-hint">Added to {addedTo}</span>}
      </div>

      {showDetails ? (
        <div className="guest-contact-panel">
          <label className="guest-contact-field">
            Number
            <input
              type="text"
              placeholder="e.g. 012-345 6789"
              value={contact.phone}
              onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
            />
          </label>
          <label className="guest-contact-field">
            Email
            <input
              type="email"
              placeholder="e.g. alice@example.com"
              value={contact.email}
              onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
            />
          </label>
          <label className="guest-contact-field">
            Address
            <input
              type="text"
              placeholder="Mailing address"
              value={contact.address}
              onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))}
            />
          </label>
          <label className="guest-contact-field">
            Notes
            <textarea
              rows={2}
              placeholder="Dietary needs, seating preference, etc."
              value={contact.notes}
              onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
            />
          </label>
          <button type="button" className="link-btn" onClick={() => setShowDetails(false)}>
            Hide contact details
          </button>
        </div>
      ) : (
        <button type="button" className="link-btn" onClick={() => setShowDetails(true)}>
          + Add their contact details (optional)
        </button>
      )}
    </form>
  );
}

type SectionProps = {
  category: GuestCategory;
  lists: GuestCategory[]; // all of this person's lists, for the "add to" picker
  guests: Guest[];
  editing: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onAddGuest: (name: string, plusCount: number, categoryId: string, isVip: boolean, contact?: ContactDetails) => void;
  onUpdateGuest: (guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount" | "isVip" | "included" | "phone" | "email" | "address" | "notes">>) => void;
  onDeleteGuest: (guestId: string) => void;
  onUpdateCategory: (categoryId: string, title: string) => void;
  onDeleteCategory: (categoryId: string) => void;
};

function CategorySection({
  category,
  lists,
  guests,
  editing,
  open,
  onToggleOpen,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
  onUpdateCategory,
  onDeleteCategory,
}: SectionProps) {
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(category.title);
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  // within an open (read-only) contact panel, which guest's own panel has
  // been switched into its editable form
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState({ phone: "", email: "", address: "", notes: "" });

  const total = attendeeTotal(guests);

  function toggleContact(guestId: string) {
    setOpenContactId((prev) => (prev === guestId ? null : guestId));
    setEditingContactId(null);
  }

  function startEditingContact(g: Guest) {
    setContactDraft({ phone: g.phone ?? "", email: g.email ?? "", address: g.address ?? "", notes: g.notes ?? "" });
    setEditingContactId(g.id);
  }

  function openContactEditor(g: Guest) {
    if (openContactId === g.id) {
      setOpenContactId(null);
    } else {
      setContactDraft({ phone: g.phone ?? "", email: g.email ?? "", address: g.address ?? "", notes: g.notes ?? "" });
      setOpenContactId(g.id);
    }
  }

  function saveContact(guestId: string) {
    onUpdateGuest(guestId, { ...contactDraft });
    setOpenContactId(null);
    setEditingContactId(null);
  }

  function startRenaming() {
    setDraftTitle(category.title);
    setRenaming(true);
  }

  function saveRename(e: React.FormEvent) {
    e.preventDefault();
    if (draftTitle.trim() && draftTitle.trim() !== category.title) {
      onUpdateCategory(category.id, draftTitle.trim());
    }
    setRenaming(false);
  }

  return (
    <div className="guest-subsection">
      <div className="guest-subsection-header-row">
        {renaming ? (
          <form className="guest-category-rename-form" onSubmit={saveRename}>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenaming(false);
              }}
            />
            <button type="submit" className="btn small primary">Save</button>
            <button type="button" className="btn small ghost" onClick={() => setRenaming(false)}>Cancel</button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="guest-subsection-header"
              onClick={onToggleOpen}
              aria-expanded={open}
            >
              <span className={`chevron ${open ? "open" : ""}`}><IconChevronRight /></span>
              <span className="view-label">{category.title}</span>
              <span className="task-pill">{total}</span>
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  title={`Rename ${category.title} list`}
                  onClick={startRenaming}
                >
                  <IconEdit size={13} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  title={`Delete ${category.title} list`}
                  onClick={() => setConfirmDeleteCategory(true)}
                >
                  <IconTrash size={13} />
                </button>
              </>
            )}
          </>
        )}
      </div>
      {confirmDeleteCategory && (
        <div className="guest-subsection-footer">
          <span className="confirm-row">
            Delete "{category.title}" list?
            <button className="btn small danger" type="button" onClick={() => onDeleteCategory(category.id)}>
              Yes, delete
            </button>
            <button className="btn small ghost" type="button" onClick={() => setConfirmDeleteCategory(false)}>
              Cancel
            </button>
          </span>
        </div>
      )}
      {open && (
        <div className="guest-subsection-body">
          {!editing ? (
            <>
              {guests.length > 0 && (
              <div className="guest-names-box">
                <ul className="task-view-list">
                  {guests.map((g) => (
                    <li key={g.id} className="guest-row">
                      <div className={`task-view-item ${g.included === false ? "task-item-excluded" : ""}`}>
                        <span className="task-status">
                          {g.isVip ? <IconHeart className="vip-heart" filled size={12} /> : "•"}
                        </span>
                        <button
                          type="button"
                          className="task-name-btn"
                          title="Click to view contact details"
                          onClick={() => toggleContact(g.id)}
                        >
                          {g.name}
                        </button>
                        {g.included === false && <span className="not-counted-badge">not counted</span>}
                        {g.plusCount > 0 && <span className="plus-badge">+{g.plusCount}</span>}
                      </div>
                      {openContactId === g.id && (
                        editingContactId === g.id ? (
                          <div className="guest-contact-panel">
                            <label className="guest-contact-field">
                              Number
                              <input
                                type="text"
                                placeholder="e.g. 012-345 6789"
                                value={contactDraft.phone}
                                onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                                autoFocus
                              />
                            </label>
                            <label className="guest-contact-field">
                              Email
                              <input
                                type="email"
                                placeholder="e.g. alice@example.com"
                                value={contactDraft.email}
                                onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                              />
                            </label>
                            <label className="guest-contact-field">
                              Address
                              <input
                                type="text"
                                placeholder="Mailing address"
                                value={contactDraft.address}
                                onChange={(e) => setContactDraft((d) => ({ ...d, address: e.target.value }))}
                              />
                            </label>
                            <label className="guest-contact-field">
                              Notes
                              <textarea
                                rows={2}
                                placeholder="Dietary needs, seating preference, etc."
                                value={contactDraft.notes}
                                onChange={(e) => setContactDraft((d) => ({ ...d, notes: e.target.value }))}
                              />
                            </label>
                            <div className="btn-row">
                              <button type="button" className="btn small primary" onClick={() => saveContact(g.id)}>
                                Save
                              </button>
                              <button type="button" className="btn small ghost" onClick={() => setEditingContactId(null)}>
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger guest-contact-actions-right"
                                title={`Delete ${g.name}`}
                                onClick={() => onDeleteGuest(g.id)}
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="guest-contact-panel guest-contact-panel-readonly">
                            <div className="guest-contact-field-view">
                              <span className="guest-contact-label">Number</span>
                              <span className="guest-contact-value">{g.phone || "—"}</span>
                            </div>
                            <div className="guest-contact-field-view">
                              <span className="guest-contact-label">Email</span>
                              <span className="guest-contact-value">{g.email || "—"}</span>
                            </div>
                            <div className="guest-contact-field-view">
                              <span className="guest-contact-label">Address</span>
                              <span className="guest-contact-value">{g.address || "—"}</span>
                            </div>
                            <div className="guest-contact-field-view">
                              <span className="guest-contact-label">Notes</span>
                              <span className="guest-contact-value">{g.notes || "—"}</span>
                            </div>
                            <div className="btn-row guest-contact-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title={`Edit ${g.name}'s contact details`}
                                onClick={() => startEditingContact(g)}
                              >
                                <IconEdit size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                title={`Delete ${g.name}`}
                                onClick={() => onDeleteGuest(g.id)}
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              )}
            </>
          ) : (
            <>
              <ul className="task-list">
                {guests.map((g) => {
                  const isIncluded = g.included !== false;
                  return (
                  <li key={g.id} className="guest-row">
                    <div className={`task-item ${isIncluded ? "" : "task-item-excluded"}`}>
                      <button
                        type="button"
                        className={`icon-btn vip-toggle ${g.isVip ? "active" : ""}`}
                        title={g.isVip ? "Remove VIP" : "Mark as VIP"}
                        onClick={() => onUpdateGuest(g.id, { isVip: !g.isVip })}
                      >
                        <IconHeart filled={g.isVip} size={13} />
                      </button>
                      <button
                        type="button"
                        className={`icon-btn eye-toggle ${isIncluded ? "" : "active"}`}
                        title={isIncluded ? "Exclude from guest count" : "Include in guest count"}
                        onClick={() => onUpdateGuest(g.id, { included: !isIncluded })}
                      >
                        {isIncluded ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className="task-name-btn"
                        title="Click to add/edit contact details"
                        onClick={() => openContactEditor(g)}
                      >
                        {g.name}
                      </button>
                      <label className="plus-input-label">
                        +
                        <input
                          className="plus-input"
                          type="number"
                          min={0}
                          placeholder="0"
                          value={g.plusCount === 0 ? "" : g.plusCount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            onUpdateGuest(g.id, {
                              plusCount: raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)) || 0),
                            });
                          }}
                        />
                      </label>
                      <button
                        className="icon-btn"
                        title={`Remove from ${category.title}`}
                        onClick={() => onDeleteGuest(g.id)}
                      >
                        <IconClose />
                      </button>
                    </div>
                    {openContactId === g.id && (
                      <div className="guest-contact-panel">
                        <label className="guest-contact-field">
                          Number
                          <input
                            type="text"
                            placeholder="e.g. 012-345 6789"
                            value={contactDraft.phone}
                            onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                            autoFocus
                          />
                        </label>
                        <label className="guest-contact-field">
                          Email
                          <input
                            type="email"
                            placeholder="e.g. alice@example.com"
                            value={contactDraft.email}
                            onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                          />
                        </label>
                        <label className="guest-contact-field">
                          Address
                          <input
                            type="text"
                            placeholder="Mailing address"
                            value={contactDraft.address}
                            onChange={(e) => setContactDraft((d) => ({ ...d, address: e.target.value }))}
                          />
                        </label>
                        <label className="guest-contact-field">
                          Notes
                          <textarea
                            rows={2}
                            placeholder="Dietary needs, seating preference, etc."
                            value={contactDraft.notes}
                            onChange={(e) => setContactDraft((d) => ({ ...d, notes: e.target.value }))}
                          />
                        </label>
                        <div className="btn-row">
                          <button type="button" className="btn small primary" onClick={() => saveContact(g.id)}>
                            Save
                          </button>
                          <button type="button" className="btn small ghost" onClick={() => setOpenContactId(null)}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger guest-contact-actions-right"
                            title={`Delete ${g.name}`}
                            onClick={() => onDeleteGuest(g.id)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>
              <GuestAddForm lists={lists} defaultListId={category.id} onAddGuest={onAddGuest} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuestOwnerCard({
  owner,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggleExpand,
  showInviteLink = false,
  deletable = true,
  nameEditable = true,
  onUpdateOwner,
  onDeleteOwner,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: Props) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const addListRef = useRef<HTMLFormElement>(null);

  function toggleCategoryOpen(categoryId: string) {
    setOpenCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }

  const inviteLink = `${window.location.origin}/guests/${owner.id}`;
  const totalAttendees = attendeeTotal(owner.guests);

  useEffect(() => {
    if (!showAddList) return;
    function handlePointerDown(e: PointerEvent) {
      if (addListRef.current && !addListRef.current.contains(e.target as Node)) {
        setShowAddList(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowAddList(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAddList]);

  useEffect(() => {
    if (!expanded) {
      setEditing(false);
      setConfirmDelete(false);
      setShowAddList(false);
      setOpenCategoryId(null);
    }
  }, [expanded]);

  function toggleExpanded() {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setUncontrolledExpanded((v) => !v);
    }
  }

  function submitNewList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    onAddCategory(newListTitle.trim());
    setNewListTitle("");
    setShowAddList(false);
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable; ignore silently
    }
  }

  return (
    <div className="card guest-owner-card">
      <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{owner.name}</span>
        <span className="task-pill">
          {totalAttendees} {totalAttendees === 1 ? "guest" : "guests"}
        </span>
      </button>

      {expanded && (
        <div className="card-body">
          {showInviteLink && (
            <div className="invite-row">
              <span className="view-label">Invite link</span>
              <div className="invite-link-box">
                <button type="button" className="btn small ghost" onClick={copyInviteLink}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
              <p className="empty-hint">Send this link so {owner.name} can add their own guests.</p>
            </div>
          )}

          {!editing ? (
            <>
              {owner.categories.length > 0 && (
                <div className="guest-owner-add">
                  <span className="view-label">Add a guest</span>
                  <GuestAddForm
                    lists={owner.categories}
                    defaultListId={owner.categories[0].id}
                    onAddGuest={onAddGuest}
                    onAdded={(listId) => setOpenCategoryId(listId)}
                  />
                </div>
              )}
              {owner.categories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  lists={owner.categories}
                  guests={owner.guests.filter((g) => g.categoryId === cat.id)}
                  editing={false}
                  open={openCategoryId === cat.id}
                  onToggleOpen={() => toggleCategoryOpen(cat.id)}
                  onAddGuest={onAddGuest}
                  onUpdateGuest={onUpdateGuest}
                  onDeleteGuest={onDeleteGuest}
                  onUpdateCategory={onUpdateCategory}
                  onDeleteCategory={onDeleteCategory}
                />
              ))}
              <div className="card-footer">
                <button
                  className="icon-btn card-footer-right"
                  title={`Edit ${owner.name}'s lists`}
                  aria-label="Edit"
                  onClick={() => setEditing(true)}
                >
                  <IconEdit size={15} />
                </button>
              </div>
            </>
          ) : (
            <>
              {nameEditable && (
                <label className="title-field">
                  List name
                  <input
                    type="text"
                    value={owner.name}
                    onChange={(e) => onUpdateOwner({ name: e.target.value })}
                  />
                </label>
              )}

              {owner.categories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  lists={owner.categories}
                  guests={owner.guests.filter((g) => g.categoryId === cat.id)}
                  editing
                  open={openCategoryId === cat.id}
                  onToggleOpen={() => toggleCategoryOpen(cat.id)}
                  onAddGuest={onAddGuest}
                  onUpdateGuest={onUpdateGuest}
                  onDeleteGuest={onDeleteGuest}
                  onUpdateCategory={onUpdateCategory}
                  onDeleteCategory={onDeleteCategory}
                />
              ))}

              <div className="card-footer">
                {confirmDelete && deletable ? (
                  <span className="confirm-row">
                    Delete this list?
                    <button className="btn small danger" onClick={onDeleteOwner}>Yes, delete</button>
                    <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </span>
                ) : (
                  <>
                    {deletable && (
                      <button className="icon-btn danger" title="Delete list" onClick={() => setConfirmDelete(true)}>
                        <IconTrash />
                      </button>
                    )}
                    {showAddList ? (
                      <form
                        className="add-owner-form guest-category-add-form"
                        ref={addListRef}
                        onSubmit={submitNewList}
                      >
                        <input
                          type="text"
                          placeholder="e.g. Highschool, Work…"
                          value={newListTitle}
                          onChange={(e) => setNewListTitle(e.target.value)}
                          autoFocus
                        />
                        <button className="btn small primary" type="submit">Add</button>
                        <button className="btn small ghost" type="button" onClick={() => setShowAddList(false)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button className="btn small ghost" type="button" onClick={() => setShowAddList(true)}>
                        + Add list
                      </button>
                    )}
                  </>
                )}
                <button className="btn small primary card-footer-right" onClick={() => setEditing(false)}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
