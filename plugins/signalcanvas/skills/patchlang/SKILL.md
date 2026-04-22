---
name: patchlang
description: >
  PatchLang v0.2.5 language reference for writing, editing, and migrating .patch files.
  Use this skill whenever you are writing or editing a .patch file, converting a hardware
  datasheet into PatchLang, updating legacy PatchLang syntax to the current version, or
  generating templates/instances/connections for SignalCanvas. Also use it when the user
  mentions PatchLang, patch files, signal flow documentation, or device templates even if
  they don't say "PatchLang" explicitly.
---

# PatchLang v0.2.5

You are writing **PatchLang v0.2.5**. The language describes broadcast/AV signal flow:
templates define device types, instances are physical devices, and connections are cables.

When you need annotated examples (Dante systems, ring networks, slot/cards, composition),
read `references/examples.md`. Load it any time you're building something non-trivial or
converting a datasheet.

---

## Critical Rules

These are the mistakes Claude most often makes. Read them before writing anything.

**1. Split directional ports — never `io` for channel protocols or WordClock.**
Dante, MADI, AES67, AES3, SDI, Analogue, SoundGrid, NDI, SMPTE2110, and WordClock each need two lines:
```
Dante_Pri_In[1..32]:  in(etherCON)  [Dante, primary]
Dante_Pri_Out[1..32]: out(etherCON) [Dante, primary]

WordClock_In:  in(BNC_75)  [WordClock]
WordClock_Out: out(BNC_75) [WordClock]
```
WordClock uses separate physical BNC connectors — it is never bidirectional. Devices that are always
clock masters declare only `WordClock_Out`; always-slaves declare only `WordClock_In`; devices that
can be either (e.g., a console) declare both.

`io` is only for ring/bus protocols (OptoCore, TWINLANe, AVB/Milan, GigaACE) and
management ports (Ethernet_Mgmt).

**2. Two connects per bidirectional cable.**
Every cable that carries signal in both directions needs two `connect` statements — one
per direction. Same cable metadata on both. This is not optional:
```
connect A.Dante_Pri_Out -> B.Dante_Pri_In { cable: "Cat6a_01" }
connect B.Dante_Pri_Out -> A.Dante_Pri_In { cable: "Cat6a_01" }
```

**3. `bridge` is for manufacturer-hardwired paths only. `route` is for operator-configured routing.**
Inside a template, `bridge Mic_In -> Dante_Pri_Out` means "the manufacturer hardwired this path — it exists in every unit of this device regardless of software configuration." Use `bridge` only when you can say: "every unit that ships from the factory has this path, and no operator action can remove it."

Operator-configurable routing (console DSP assignments, matrix crosspoints, mix bus patching) belongs in the **instance body** as `route`, not in the template as `bridge`.

```
# Correct — stagebox mic preamp is hardwired to Dante by the manufacturer
template Rio1608 {
  bridge Mic_In -> Dante_Pri_Out   # hardwired, correct
}

# Correct — CL5 has no manufacturer-hardwired signal paths; routing is all software
template CL5 {
  # no bridge declarations — all routing documented as route in instances
}

# Correct — routing state documented in the instance
instance FOH_Console is CL5 {
  route Dante_In[1] -> Fader[1]
  route Dante_In[2] -> Fader[2]
}
```

The bridge target is where the signal is *going*, not where it comes from.

**4. No hyphens in identifiers — use underscores.**
`FOH_Console` is valid. `FOH-Console` is a parse error.

**5. `card` is not a keyword.**
Cards are regular templates with `meta { device_type: "card", fits: "SlotFormat" }`.
There is no `card` declaration syntax.

**6. Slot assignments use bare identifiers, not quoted strings.**
```
slot MY_Slot[1]: MY16_AUD       # correct
slot MY_Slot[1]: "MY16_AUD"     # wrong (legacy — do not emit)
```

**7. Ring members must use explicit port references in emitted code.**
```
member Console.OptoCore_A       # correct — explicit, survives device changes
member Console                  # implicit — only safe in source, avoid in generated code
```

**8. Config labels reference split port names.**
```
config FOH_Console {
  label Dante_Pri_In[1]: "Lead Vocal"   # correct — uses the directional name
}
```

**9. ID format uses `::` separator.**
Port IDs: `pl::TemplateName::PortName`. Route IDs: `rule::template::src::dst`.
The old `pl_TemplateName_PortName` underscore format is legacy — do not generate it.

**10. Keywords cannot be template/instance/port names.**
`template`, `instance`, `is`, `connect`, `bridge`, `bridge_group`, `link_group`,
`signal`, `flag`, `stream`, `config`, `ports`, `meta`, `in`, `out`, `io`, `ring`, `member`
are all reserved. `card` and `auto` (outside brackets) are valid identifiers.

---

## Compact Syntax Reference

### Template

```
template TemplateName {
  meta {
    manufacturer: "Acme"
    model: "Model_X"
    category: "Console"         # Camera | Stagebox | Console | Router | IEM | Sync | etc.
  }
  ports {
    PortName[1..N]: direction(Connector) [attr1, attr2]
  }
  bridge LocalPort -> LocalPort  # logical signal path inside the template
  slot SlotName[1..N]: SlotFormat
}
```

### Instance

```
instance DeviceName is TemplateName {
  location: "Stage Left"
  ip: "192.168.1.10"
  slot SlotName[1]: CardTemplateName
  route Port_In[1] -> Port_Out[1]
}
```

### Connect

```
connect Instance_A.Port_Out[1..4] -> Instance_B.Port_In[1..4] {
  cable: "Cable_Label"
  length: "30m"
  @suppress(logical)            # optional: suppress specific DRC layers
}
```

### Bridge (top-level)

```
bridge Instance_A.Port_Out[1..32] -> Instance_B.Port_In[1..32]
```

### Ring

```
ring RingName {
  protocol: "OptoCore"          # or TWINLANe, AVB, Milan, GigaACE
  member Instance_A.Port_A
  member Instance_B.Port_A
  member Instance_C.Port_A
}
```

### Signal / Flag / Stream

```
signal LeadVocal {
  origin: Stagebox.Mic_In[1]
  description: "Worship leader vocal"
}

flag Genlock_OK {
  description: "All cameras genlocked"
  severity: "info"
}
```

### Config

```
config InstanceName {
  label Port_In[1]: "Channel Label" { phantom: "true" }
  label Port_In[2]: "Kick Drum"
}
```

### Multi-file import

```
use yamaha { CL5, Rio3224 }    # selective
use shure.*                     # wildcard
use buildings.foh               # bare namespace → buildings/foh.patch
```

### Auto-assignment

```
connect Stage.Dante_Pri_Out[auto] -> Console.Dante_Pri_In[1..16]
# Compiler fills [auto] with next N available contiguous channels in declaration order.
# Do not use [auto] on both sides. Do not use [auto] with route or bus.
```
> **Note:** `[auto]` is specified in v0.2.5 but may not be in the current WASM build.
> Verify before using; fall back to explicit ranges if the parser rejects it.

### Port directions

| Direction | Use when |
|-----------|----------|
| `in(Connector)` | Signal enters the device |
| `out(Connector)` | Signal leaves the device |
| `io(Connector)` | Ring/bus protocols and management only (OptoCore, TWINLANe, AVB/Milan, GigaACE, Ethernet_Mgmt) |

### Common connectors

`XLR` `BNC_75` `BNC_50` `etherCON` `RJ45` `SFP` `LC_Fiber` `SC_Fiber`
`HDMI` `USB` `TRS_14` `TRS_3` `DB25` `SpeakON` `SMA`

### Common attributes

`Dante` `primary` `secondary` `MADI` `AES3` `AES67` `SDI` `SMPTE2110`
`NDI` `Analogue` `OptoCore` `TWINLANe` `WordClock` `RF` `USB` `redundant`

---

## Migration Cheat Sheet

These patterns appear in pre-v0.2.0 files. Update them when you encounter them.

| Old (legacy) | New (v0.2.5) |
|---|---|
| `Dante_io[1..32]: io(etherCON) [Dante]` | Two lines: `Dante_In[1..32]: in(...)` + `Dante_Out[1..32]: out(...)` |
| Single `connect A.Dante -> B.Dante` | Two connects: forward path + return path |
| `bridge A.Dante_io -> B.Dante_io` | `bridge A.Mic_In -> A.Dante_Pri_Out` (inside template, directional) |
| `pl_CL5_Dante_In` (port ID) | `pl::CL5::Dante_In` |
| `slot MY_Slot[1]: "MY16_AUD"` (quoted) | `slot MY_Slot[1]: MY16_AUD` (bare identifier) |
| `member Console` (implicit ring member) | `member Console.OptoCore_A` (explicit) |
| `label Dante_io[1]: "Label"` | `label Dante_Pri_In[1]: "Label"` (directional port name) |
| `config label` referring to `io` port | Update to the split `in` port name |

---

## DRC Quick Reference

Errors you will see and what they mean:

| Code | Meaning | Fix |
|------|---------|-----|
| D01/D02 | `out→out` or `in→in` connection | Swap direction on one side; check split port names |
| L01 | Protocol mismatch (Dante → SDI, etc.) | Check that both ports share a protocol attribute; use `@suppress(logical)` if intentional |
| M01 | Connector mismatch (XLR → BNC) | Add `@suppress(mechanical)` if intentional cross-connection |
| S03 | Unknown port on instance | Port name typo, or using old `io` name after migration to split ports |
| S06 | Channel index out of range | Index exceeds the port's `[1..N]` declaration |
| S14 | Vector port referenced without index | Add `[1..N]` or `[auto]` to the reference |
| R01-R04 | Ring errors | R01: bad instance name; R02: bad port name; R03: protocol mismatch; R04: ambiguous implicit member |
| C01 | Orphaned device (info only) | Expected on leaf devices with no connections yet; not an error |
| S15 | Range size mismatch on `connect` | Left and right channel counts differ — fix the ranges, or add `@suppress(structural)` if intentional (partial connect) |
| A02-A05 | Auto-assignment errors | A02: both sides are `[auto]`; A03: scalar port; A04: range overflow; A05: fragmented range |

Use `@suppress(layer)` inside a connect body to silence specific checks.
Valid layers: `direction`, `mechanical`, `electrical`, `logical`, `temporal`, `structural`, `all`.

---

## Datasheet → PatchLang Workflow

When given a hardware spec sheet, follow this order:

1. **Name the template** after the model number only — `CL5`, not `Yamaha_CL5`.

2. **Fill `meta`** — manufacturer, model, category. For expansion cards add
   `device_type: "card"` and `fits: "SlotFormat"`.

3. **Map physical ports** — for each physical connector on the device:
   - Identify connector type (`XLR`, `BNC_75`, `etherCON`, etc.)
   - Identify protocol (`Dante`, `MADI`, `SDI`, `Analogue`, etc.)
   - Channel-based protocol? → write `in` + `out` lines with channel count as range
   - Ring/bus protocol (OptoCore, TWINLANe, AVB)? → write `io` line
   - No protocol? → omit attribute list

4. **Add bridges** for internal signal paths — mic preamps → Dante out,
   Dante in → line outputs, SDI in → SDI out (router passthrough).

5. **Declare slots** if the device has expansion bays:
   `slot BayName[1..N]: SlotFormatIdentifier`

6. **Write instances** with `location` and `ip` from the spec.

7. **Write connections** — one `connect` per direction per cable.
   Bidirectional cables always get two connects with matching `cable:` metadata.
