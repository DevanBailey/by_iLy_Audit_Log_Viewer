tLogs(page : Nat, pageSize : Nat)
//   -> { entries : [AuditEntry]; total : Nat }
//
//   Returns a page-based slice of the audit log.
//   `page`     : 0-indexed page number
//   `pageSize` : number of entries per page (recommended: 10)
//   `total`    : total number of entries in the log (used to compute page count)
//
// getMyRole()
//   -> Text
//
//   Returns the role of the calling principal as a plain string.
//   Returns "admin" for privileged principals, "user" for all others.
//   Replace the body of this function with your own RBAC lookup when integrating
//   into an existing canister.
//
// RBAC integration note
// ---------------------
// In the full platform, getMyRole() queries a per-entity role store with
// admin / editor / viewer tiers. For the standalone module a simple principal
// check is used. To integrate with your own RBAC, replace the comparison in
// getMyRole() with a lookup into your role store.
//
// Audit log emission note
// -----------------------
// The full platform appends AuditEntry records on every state-mutating call
// (create, update, delete), on role assignments/revocations, and on
// access-denied events. Replace the hardcoded `auditLogs` array with a
// StableBuffer or TrieMap backed by stable memory and append from your
// update functions.

import Array "mo:core/Array";
import Iter  "mo:core/Iter";

actor {

  // ─── Types ──────────────────────────────────────────────────────────────────

  /// A single audit log record.
  public type AuditEntry = {
    /// Unix timestamp in milliseconds (Int to accommodate nanosecond-precision
    /// values from Time.now() divided by 1_000_000).
    timestamp : Int;
    /// Textual representation of the caller's Principal.
    principal : Text;
    /// Dot-separated action identifier, e.g. "record.create", "role.assign".
    action    : Text;
    /// Human-readable entity reference, e.g. "Invoice:1042", "User:alice".
    entity    : Text;
  };

  // ─── Sample data ────────────────────────────────────────────────────────────
  //
  // Replace this array with a read from your own stable log store.

  let auditLogs : [AuditEntry] = [
    { timestamp = 1720000000000; principal = "2vxsx-fae";    action = "user.login";       entity = "User:alice"          },
    { timestamp = 1720010000000; principal = "un4fu-tqaaa";  action = "record.create";    entity = "Invoice:1042"        },
    { timestamp = 1720020000000; principal = "rrkah-fqaaa";  action = "record.update";    entity = "Invoice:1042"        },
    { timestamp = 1720030000000; principal = "2vxsx-fae";    action = "report.export";    entity = "Report:Q4-2025"      },
    { timestamp = 1720040000000; principal = "un4fu-tqaaa";  action = "settings.update";  entity = "Settings:global"     },
    { timestamp = 1720050000000; principal = "2vxsx-fae";    action = "user.logout";      entity = "User:alice"          },
    { timestamp = 1720060000000; principal = "rrkah-fqaaa";  action = "access.denied";    entity = "User:bob"            },
    { timestamp = 1720070000000; principal = "un4fu-tqaaa";  action = "password.change";  entity = "User:claire"         },
    { timestamp = 1720080000000; principal = "2vxsx-fae";    action = "role.assign";      entity = "Role:editor"         },
    { timestamp = 1720090000000; principal = "rrkah-fqaaa";  action = "record.delete";    entity = "Invoice:1042"        },
    { timestamp = 1720100000000; principal = "2vxsx-fae";    action = "user.login";       entity = "User:bob"            },
    { timestamp = 1720110000000; principal = "un4fu-tqaaa";  action = "record.create";    entity = "Invoice:2001"        },
    { timestamp = 1720120000000; principal = "rrkah-fqaaa";  action = "record.update";    entity = "Invoice:2001"        },
    { timestamp = 1720130000000; principal = "2vxsx-fae";    action = "report.export";    entity = "Report:Annual-2025"  },
    { timestamp = 1720140000000; principal = "un4fu-tqaaa";  action = "settings.update";  entity = "Settings:regional"   },
    { timestamp = 1720150000000; principal = "2vxsx-fae";    action = "user.logout";      entity = "User:bob"            },
    { timestamp = 1720160000000; principal = "rrkah-fqaaa";  action = "access.denied";    entity = "User:dave"           },
    { timestamp = 1720170000000; principal = "un4fu-tqaaa";  action = "password.change";  entity = "User:eva"            },
    { timestamp = 1720180000000; principal = "2vxsx-fae";    action = "role.assign";      entity = "Role:viewer"         },
    { timestamp = 1720190000000; principal = "rrkah-fqaaa";  action = "record.delete";    entity = "Invoice:2001"        },
    { timestamp = 1720200000000; principal = "2vxsx-fae";    action = "user.login";       entity = "User:frank"          },
    { timestamp = 1720210000000; principal = "un4fu-tqaaa";  action = "record.create";    entity = "Invoice:3005"        },
    { timestamp = 1720220000000; principal = "rrkah-fqaaa";  action = "record.update";    entity = "Invoice:3005"        },
    { timestamp = 1720230000000; principal = "2vxsx-fae";    action = "report.export";    entity = "Report:Monthly-2025" },
    { timestamp = 1720240000000; principal = "un4fu-tqaaa";  action = "settings.update";  entity = "Settings:advanced"   },
  ];

  // ─── Queries ─────────────────────────────────────────────────────────────────

  /// Return a page of audit log entries.
  ///
  /// Input:
  ///   page     : Nat  -- 0-indexed page number
  ///   pageSize : Nat  -- entries per page
  ///
  /// Output:
  ///   { entries : [AuditEntry]; total : Nat }
  ///   entries -- the slice for the requested page (may be shorter on the last page)
  ///   total   -- total number of log entries (use to compute totalPages client-side)
  public query func getAuditLogs(page : Nat, pageSize : Nat) : async {
    entries : [AuditEntry];
    total   : Nat;
  } {
    let start   = page * pageSize;
    let logSize = auditLogs.size();
    let end     = if (start + pageSize > logSize) { logSize } else { start + pageSize };
    let entries = if (start >= logSize) { [] } else {
      Iter.toArray(Array.slice(auditLogs, start, end))
    };
    { entries; total = logSize };
  };

  /// Return the role of the calling principal.
  ///
  /// Output: Text -- "admin" | "user"
  ///
  /// Integration note: replace the principal comparison below with a lookup
  /// into your own RBAC store. The frontend renders the audit log only when
  /// this function returns "admin".
  public query ({ caller }) func getMyRole() : async Text {
    if (caller.toText() == "2vxsx-fae") { "admin" } else { "user" };
  };

};