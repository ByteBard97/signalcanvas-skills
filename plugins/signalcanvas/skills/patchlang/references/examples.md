# PatchLang Examples

Examples progress from simple to complex. Each is a complete, compiler-verified snippet.

---

## 1. Single Device Template

The minimal pattern: one template, one instance. No connections needed at this scale.
The compiler may emit a C01 info (orphaned device) — that is expected when a device
exists at the leaf level with nothing to connect to yet.

```
template SM7dB {
  meta {
    manufacturer: "Shure"
    model: "SM7dB"
    category: "Microphone"
  }
  ports {
    XLR_Out: out(XLR) [Analogue]
    USB_Out: out(USB)
  }
}

instance Vocal_Mic is SM7dB {
  location: "Vocal Booth"
}
```

---

## 2. Dante Console / Stagebox Pair

The most common real-world pattern. Key points:
- Dante needs split `in`/`out` port lines (never `io`)
- Two `connect` statements per physical cable (one each direction)
- Internal `bridge` uses directional port names — signal travels *from* Mic_In *to* Dante_Pri_Out
- Top-level `bridge` traces the signal path across instances for DRC

```
template Rio1608 {
  meta {
    manufacturer: "Yamaha"
    model: "Rio1608-D2"
    category: "Stagebox"
  }
  ports {
    Dante_Pri_In[1..16]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..16]: out(etherCON) [Dante, primary]
    Mic_In[1..16]:        in(XLR)
    Line_Out[1..8]:       out(XLR)
  }
  bridge Mic_In -> Dante_Pri_Out
  bridge Dante_Pri_In -> Line_Out
}

template QL5 {
  meta {
    manufacturer: "Yamaha"
    model: "QL5"
    category: "Console"
  }
  ports {
    Dante_Pri_In[1..64]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..16]: out(etherCON) [Dante, primary]
  }
}

instance Stage_Box is Rio1608 {
  location: "Stage Left"
  ip: "192.168.1.31"
}

instance FOH_Console is QL5 {
  location: "Front of House"
  ip: "192.168.1.10"
}

# Two connects — one per direction — same cable label on both
connect Stage_Box.Dante_Pri_Out[1..16] -> FOH_Console.Dante_Pri_In[1..16] {
  cable: "Cat6a_Stage_Pri"
  length: "40m"
}
connect FOH_Console.Dante_Pri_Out[1..8] -> Stage_Box.Dante_Pri_In[1..8] {
  cable: "Cat6a_Stage_Pri"
  length: "40m"
}

# Signal path bridge for DRC tracing: mic → Dante network → console
bridge Stage_Box.Mic_In[1..16] -> FOH_Console.Dante_Pri_In[1..16]

config FOH_Console {
  label Dante_Pri_In[1]: "Kick In" { phantom: "true" }
  label Dante_Pri_In[2]: "Snare Top"
  label Dante_Pri_In[3]: "Lead Vocal" { phantom: "true" }
}
```

---

## 3. Multiple Stageboxes into a Console

When connecting several stageboxes to a console, you need to assign channel ranges
carefully so they don't overlap on the console's Dante input. Each stagebox occupies
a contiguous slice.

> **Note on `[auto]`:** The spec defines `[auto]` to let the compiler assign channels
> automatically, but this feature may not be in the current WASM build. Use explicit
> ranges until `[auto]` is confirmed available in your deployed version.

```
template Rio1608_D2 {
  meta {
    manufacturer: "Yamaha"
    model: "Rio1608-D2"
    category: "Stagebox"
  }
  ports {
    Dante_Pri_In[1..16]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..16]: out(etherCON) [Dante, primary]
    Mic_In[1..16]:        in(XLR)
    Line_Out[1..8]:       out(XLR)
  }
  bridge Mic_In -> Dante_Pri_Out
}

template CL5 {
  meta {
    manufacturer: "Yamaha"
    model: "CL5"
    category: "Console"
  }
  ports {
    Dante_Pri_In[1..72]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..24]: out(etherCON) [Dante, primary]
  }
}

instance Stage_Left  is Rio1608_D2 { location: "Stage Left" }
instance Stage_Right is Rio1608_D2 { location: "Stage Right" }
instance Console     is CL5        { location: "Front of House" }

# Stage_Left  → Console channels 1–16
# Stage_Right → Console channels 17–32
connect Stage_Left.Dante_Pri_Out[1..16]  -> Console.Dante_Pri_In[1..16]  { cable: "Cat6a_SL" }
connect Stage_Right.Dante_Pri_Out[1..16] -> Console.Dante_Pri_In[17..32] { cable: "Cat6a_SR" }

# Return: console sends monitor mix back to stageboxes
connect Console.Dante_Pri_Out[1..8]  -> Stage_Left.Dante_Pri_In[1..8]  { cable: "Cat6a_SL" }
connect Console.Dante_Pri_Out[9..16] -> Stage_Right.Dante_Pri_In[1..8] { cable: "Cat6a_SR" }
```

---

## 4. Ring Network (DiGiCo OptoCore)

Ring topology uses `io` ports and a `ring` declaration. Member order reflects physical
ring topology. When a device has multiple ring ports, always use explicit port references
(`member Instance.Port`) — implicit form (`member Instance`) only works when the device
has exactly one port matching the ring protocol.

```
template SD12 {
  meta {
    manufacturer: "DiGiCo"
    model: "SD12"
    category: "Console"
  }
  ports {
    OptoCore_A:     io(SFP) [OptoCore]
    OptoCore_B:     io(SFP) [OptoCore]
    MADI_In[1..64]: in(BNC_75) [MADI]
    MADI_Out[1..64]:out(BNC_75) [MADI]
  }
}

template SD_Rack {
  meta {
    manufacturer: "DiGiCo"
    model: "SD-Rack"
    category: "Stagebox"
  }
  ports {
    OptoCore_A:    io(SFP) [OptoCore]
    OptoCore_B:    io(SFP) [OptoCore]
    Mic_In[1..56]: in(XLR)
    Line_Out[1..8]:out(XLR)
  }
}

instance Console    is SD12    { location: "Front of House" }
instance Stage_Rack is SD_Rack { location: "Stage Left" }
instance Mon_Rack   is SD_Rack { location: "Monitor World" }

# Primary ring — A ports, follows physical fiber loop order
ring OptoCore_Primary {
  protocol: "OptoCore"
  member Console.OptoCore_A
  member Stage_Rack.OptoCore_A
  member Mon_Rack.OptoCore_A
}

# Redundant ring — B ports for backup fiber path
ring OptoCore_Redundant {
  protocol: "OptoCore"
  member Console.OptoCore_B
  member Stage_Rack.OptoCore_B
  member Mon_Rack.OptoCore_B
}
```

---

## 5. Slot / Card Installation

Templates with expansion bays declare `slot` lines. Cards are templates with
`device_type: "card"` and `fits` in meta. Instances assign specific cards to slots
using bare identifiers (not quoted strings).

```
template MY16_AUD {
  meta {
    manufacturer: "Yamaha"
    model: "MY16-AUD"
    device_type: "card"
    fits: "MY_Format"
  }
  ports {
    Dante_In[1..16]:  in(etherCON) [Dante]
    Dante_Out[1..16]: out(etherCON) [Dante]
  }
}

template M7CL {
  meta {
    manufacturer: "Yamaha"
    model: "M7CL"
    category: "Console"
  }
  ports {
    Mic_In[1..24]:  in(XLR)
    Line_Out[1..8]: out(XLR)
  }
  slot MY_Slot[1..4]: MY_Format
}

instance FOH is M7CL {
  location: "Front of House"
  slot MY_Slot[1]: MY16_AUD
  slot MY_Slot[2]: MY16_AUD
}
```

---

## 6. Template Composition (Subsystem)

A template can contain nested instances and connections, turning a group of devices into
a reusable block. When instantiated, the entire subsystem appears as one node on the
canvas — double-clicking drills into the internal view.

```
template PSM1000 {
  meta {
    manufacturer: "Shure"
    model: "PSM1000"
    category: "IEM"
  }
  ports {
    Dante_In[1..2]: in(etherCON) [Dante, primary]
    RF_Out[1..2]:   out(BNC_50) [RF]
  }
}

template QL1 {
  meta {
    manufacturer: "Yamaha"
    model: "QL1"
    category: "Console"
  }
  ports {
    Dante_Pri_In[1..32]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..16]: out(etherCON) [Dante, primary]
  }
}

# A self-contained monitor rig: console + three IEM packs wired internally
template Monitor_Rig {
  meta { category: "Subsystem" }
  ports {
    Dante_In[1..32]: in(etherCON) [Dante, primary]
  }

  instance Console  is QL1
  instance IEM_WL   is PSM1000
  instance IEM_MD   is PSM1000
  instance IEM_Keys is PSM1000

  connect Console.Dante_Pri_Out[1..2] -> IEM_WL.Dante_In[1..2]
  connect Console.Dante_Pri_Out[3..4] -> IEM_MD.Dante_In[1..2]
  connect Console.Dante_Pri_Out[5..6] -> IEM_Keys.Dante_In[1..2]
}

instance Monitors is Monitor_Rig {
  location: "Monitor World"
}
```

---

## 7. Multi-File Project Structure

For large projects, split templates across files using `use` statements. The compiler
walks `use` statements from the root file to discover all dependencies — no manifest
needed beyond `project.json`.

**`project.json`**
```json
{
  "name": "Worship Venue",
  "root": "campus.patch"
}
```

**`campus.patch`**
```
use lib.yamaha { CL5, Rio3224 }

instance FOH_Console is CL5    { location: "Front of House" }
instance Stage_Left  is Rio3224 { location: "Stage Left" }

connect Stage_Left.Dante_Pri_Out -> FOH_Console.Dante_Pri_In {
  cable: "Cat6a_SL_Pri"
  length: "30m"
}
connect FOH_Console.Dante_Pri_Out -> Stage_Left.Dante_Pri_In {
  cable: "Cat6a_SL_Pri"
  length: "30m"
}
```

**`lib/yamaha.patch`**
```
template Rio3224 {
  meta {
    manufacturer: "Yamaha"
    model: "Rio3224"
    category: "Stagebox"
  }
  ports {
    Dante_Pri_In[1..32]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..32]: out(etherCON) [Dante, primary]
    Mic_In[1..32]:        in(XLR)
    Line_Out[1..16]:      out(XLR)
  }
  bridge Mic_In -> Dante_Pri_Out
}

template CL5 {
  meta {
    manufacturer: "Yamaha"
    model: "CL5"
    category: "Console"
  }
  ports {
    Dante_Pri_In[1..72]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..24]: out(etherCON) [Dante, primary]
  }
}
```

Namespace resolution: dots map to path separators. `use lib.yamaha` → `lib/yamaha.patch`.
Call `compile_project(filesMap, "campus.patch")` with a map of all file paths to sources.

---

## 8. DRC Suppression

When a connection intentionally crosses protocol or direction boundaries, suppress the
specific DRC layer. Always name the layer — `@suppress(all)` silences everything and
hides real problems.

```
template Stagebox_16 {
  meta { model: "16ch XLR Box", category: "Stagebox" }
  ports {
    Mic_In[1..16]:    in(XLR) [Analogue]
    Line_Out[1..16]:  out(XLR) [Analogue]
  }
}

template Recorder {
  meta { model: "MTR", category: "Recorder" }
  ports {
    Line_In[1..16]:   in(TRS_14) [Analogue]
    Line_Out[1..16]:  out(TRS_14) [Analogue]
  }
}

instance Drums    is Stagebox_16 { location: "Stage" }
instance DAW_Rack is Recorder    { location: "Production Rack" }

# XLR to TRS adapter cable — suppress connector mismatch (M01)
connect Drums.Mic_In[1..8] -> DAW_Rack.Line_In[1..8] {
  @suppress(mechanical, direction)
  cable: "XLR_TRS_Adapter"
  length: "3m"
}
```
