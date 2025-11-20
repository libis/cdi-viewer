# Generic JSON-LD Usage Guide

This guide shows how to use the CDI Viewer as a **general-purpose JSON-LD editor and SHACL validator** for any RDF vocabulary.

**Note:** By default, the viewer loads in DDI-CDI mode (since the tool is named `cdi-viewer`). To use it with other vocabularies:

- **Generic mode:** [https://libis.github.io/cdi-viewer/?shacl=generic](https://libis.github.io/cdi-viewer/?shacl=generic)
- **No shapes preloaded** - Select from dropdown or enter custom URL

## Table of Contents

- [Getting Started](#getting-started)
- [Supported Vocabularies](#supported-vocabularies)
- [Loading Custom SHACL Shapes](#loading-custom-shacl-shapes)
- [Editing Workflow](#editing-workflow)
- [Advanced Features](#advanced-features)
- [Common Patterns](#common-patterns)

## Getting Started

### Basic Workflow

1. **Prepare your JSON-LD file**
   - Any valid JSON-LD with `@context` and `@graph` (or single object)
   - Can use prefixed or expanded forms
   - Supports nested objects and references

2. **Find or create SHACL shapes**
   - Use built-in shapes (schema.org, DCAT, DataCube, SKOS)
   - Load from URL (must be Turtle format)
   - Create custom shapes for your vocabulary

3. **Load and edit in the viewer**
   - Visual property classification (REQUIRED/OPTIONAL/EXTRA)
   - Smart input types based on SHACL constraints
   - Real-time validation feedback

4. **Export validated JSON-LD**
   - Download modified file
   - Use in your application
   - Upload to Dataverse or other system

## Supported Vocabularies

The viewer works with **any JSON-LD vocabulary**. Here are common examples:

### schema.org

Perfect for web-visible metadata (Google Dataset Search, etc.)

**Example:**
```json
{
  "@context": "https://schema.org/",
  "@type": "Dataset",
  "name": "Climate Data 2024",
  "description": "Temperature readings",
  "creator": {
    "@type": "Person",
    "name": "Jane Smith",
    "affiliation": "University Lab"
  },
  "distribution": {
    "@type": "DataDownload",
    "contentUrl": "https://example.org/data.csv"
  }
}
```

**SHACL shapes:** Create custom shapes or use schema.org's type hierarchy for validation.

### DCAT (Data Catalog Vocabulary)

For data catalogs and open data portals.

**Example:**
```json
{
  "@context": "http://www.w3.org/ns/dcat#",
  "@type": "Catalog",
  "title": "Research Data Catalog",
  "dataset": [
    {
      "@type": "Dataset",
      "title": "Sample Dataset",
      "distribution": {
        "@type": "Distribution",
        "accessURL": "https://example.org/data"
      }
    }
  ]
}
```

**SHACL shapes:** Built-in DCAT-AP 3.0 shapes (`dcat-ap-3.0`)

### FOAF (Friend of a Friend)

For people and social networks.

**Example:**
```json
{
  "@context": "http://xmlns.com/foaf/0.1/",
  "@type": "Person",
  "name": "John Doe",
  "mbox": "mailto:john@example.org",
  "knows": {
    "@type": "Person",
    "name": "Jane Smith"
  }
}
```

**SHACL shapes:** Find FOAF SHACL shapes in [SHACL Catalog](https://github.com/sparna-git/SHACL-Catalog)

### Dublin Core

For library metadata and general resource description.

**Example:**
```json
{
  "@context": "http://purl.org/dc/terms/",
  "@type": "Text",
  "title": "Research Paper",
  "creator": "John Doe",
  "subject": "Machine Learning",
  "date": "2024-01-01"
}
```

**SHACL shapes:** Create custom shapes based on Dublin Core properties

## Loading Custom SHACL Shapes

### From URL

1. Select **"Custom URL"** from the SHACL dropdown
2. Enter the full URL to your `.ttl` file
3. Click **"Load Custom Shapes"**

**Requirements:**
- Must be Turtle format (`.ttl`)
- Must use Core SHACL features only (no SPARQL constraints)
- Must be accessible via HTTPS with CORS enabled

**Example URLs:**
```
# GitHub raw content
https://raw.githubusercontent.com/username/repo/main/shapes.ttl

# Permanent identifier
https://w3id.org/my-vocab/shapes.ttl

# Direct link
https://example.org/shapes/my-shapes.ttl
```

### Creating Your Own Shapes

**Minimal SHACL shape example:**

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix schema: <https://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

schema:DatasetShape
  a sh:NodeShape ;
  sh:targetClass schema:Dataset ;
  sh:property [
    sh:path schema:name ;
    sh:name "Name" ;
    sh:description "The name of the dataset" ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
  ] ;
  sh:property [
    sh:path schema:description ;
    sh:name "Description" ;
    sh:description "A description of the dataset" ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path schema:creator ;
    sh:name "Creator" ;
    sh:description "The creator of the dataset" ;
    sh:node schema:PersonShape ;
  ] .

schema:PersonShape
  a sh:NodeShape ;
  sh:targetClass schema:Person ;
  sh:property [
    sh:path schema:name ;
    sh:name "Name" ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
  ] .
```

**Key SHACL properties used by the viewer:**

- `sh:path` - Property being constrained (maps to JSON-LD key)
- `sh:name` - Human-readable label shown in UI
- `sh:description` - Help text shown as tooltip
- `sh:datatype` - Controls input type (xsd:string, xsd:integer, xsd:date, etc.)
- `sh:minCount` - If > 0, marked as REQUIRED
- `sh:maxCount` - Controls array behavior (1 = single value)
- `sh:node` or `sh:class` - For complex objects/references
- `sh:in` - For enumerated values (dropdown)

## Editing Workflow

### Step 1: Load and Inspect

1. **Load your JSON-LD file**
   - Click "Load Local File" or provide URL parameter
   - File automatically normalized to `@graph` format

2. **Load SHACL shapes**
   - Select from built-in options or provide custom URL
   - Shapes load asynchronously

3. **Review structure**
   - Root nodes shown as expandable cards
   - Referenced nodes nested inline
   - Properties classified with color badges

### Step 2: Edit Properties

**Simple values:**
- Click in input field and type
- Changes marked with teal highlight
- Validation updates in real-time

**Dates:**
- Click date picker icon
- Select date from calendar
- Format: YYYY-MM-DD (ISO 8601)

**Enumerations:**
- Select from dropdown (if `sh:in` constraint)
- Only valid values allowed

**URIs:**
- Text input with URI validation
- Can paste full URLs

### Step 3: Add Properties

**From SHACL suggestions:**
1. Scroll to "Add Properties" section
2. Select property from searchable dropdown
3. Click "Add Property"
4. Required properties marked with ⚠️

**Custom properties:**
1. Click "Add Custom Property"
2. Enter property name
3. Property added as text input

### Step 4: Manage Arrays

**Convert single → array:**
1. Click "Convert to Array" button
2. Current value becomes first array element
3. Click "Add Value" to add more items

**Convert array → single:**
1. Click "Convert to Single Value"
2. Confirm action (only first value kept)

**Add to array:**
- **"Add Value"** - Add simple text/number value
- **"Add Reference/Object"** - Add reference or create nested object

### Step 5: Work with Complex Objects

**Create nested object:**
1. Click "Add Reference/Object" on any property
2. Modal opens with two options:
   - **Reference existing node** - Select from dropdown
   - **Create new object** - Enter type name
3. Click "Add"
4. New node renders inline for editing

**Reference existing node:**
1. Choose "Reference existing node"
2. Select from dropdown (shows all `@id` values)
3. Creates `{"@id": "..."}` reference
4. Renders as clickable jump button

### Step 6: Validate and Export

**Validation:**
- Automatic after loading shapes
- Click "Validate" button to re-run
- Results shown with:
  - Total violations count
  - List of specific issues
  - Links to problematic properties

**Export:**
1. Click "Export JSON-LD"
2. File downloads with all changes
3. Original `@context` preserved
4. Structure maintained

## Advanced Features

### Tree View

- **Collapsible nodes** - Click header to collapse/expand
- **Nested rendering** - Referenced nodes shown inline
- **Indentation** - Visual hierarchy for nested objects
- **Jump buttons** - Click reference to scroll to target node

### Property Classification

Visual badges show property status:

- **🔵 OPTIONAL** - In SHACL shapes but not required (sh:minCount = 0 or unspecified)
- **🔴 REQUIRED** - In SHACL shapes with sh:minCount > 0
- **🟡 EXTRA** - Not in SHACL shapes (custom properties)
- **🔷 CHANGED** - Modified in edit mode

### Input Types

Automatically detected from SHACL `sh:datatype`:

| SHACL Datatype | Input Type | Example |
|----------------|------------|---------|
| `xsd:string` | Text input | "Sample text" |
| `xsd:integer` | Number input | 42 |
| `xsd:decimal` | Number input | 3.14 |
| `xsd:date` | Date picker | 2024-01-01 |
| `xsd:dateTime` | Datetime input | 2024-01-01T12:00:00 |
| `xsd:boolean` | Checkbox | true/false |
| `xsd:anyURI` | URL input | https://example.org |

### Cardinality Enforcement

The viewer respects SHACL cardinality constraints:

- **`sh:maxCount 1`** - Single value only (no array)
- **No `sh:maxCount`** - Can be array or single value
- **`sh:minCount 1`** - Required (cannot delete)
- **`sh:minCount 0` or unspecified** - Optional (can delete)

### Blank Nodes

Automatically generated for nested objects:

- **Format:** `_:propertyName_timestamp`
- **Behavior:** Always rendered inline (never as root nodes)
- **Editing:** Full editing capabilities just like named nodes

## Common Patterns

### Pattern 1: Dataset with Creator

```json
{
  "@context": "https://schema.org/",
  "@graph": [
    {
      "@type": "Dataset",
      "@id": "http://example.org/dataset/1",
      "name": "My Dataset",
      "creator": { "@id": "_:person1" }
    },
    {
      "@type": "Person",
      "@id": "_:person1",
      "name": "Jane Smith",
      "affiliation": "University Lab"
    }
  ]
}
```

**How to create:**
1. Add "creator" property
2. Click "Add Reference/Object"
3. Choose "Create new object"
4. Enter type: "Person"
5. Edit nested Person properties

### Pattern 2: Array of Keywords

```json
{
  "@type": "Dataset",
  "keywords": ["climate", "temperature", "weather"]
}
```

**How to create:**
1. Add "keywords" property (text input)
2. Click "Convert to Array"
3. Click "Add Value" for each keyword

### Pattern 3: Distribution Array

```json
{
  "@type": "Dataset",
  "distribution": [
    {
      "@type": "DataDownload",
      "contentUrl": "https://example.org/data.csv",
      "encodingFormat": "text/csv"
    },
    {
      "@type": "DataDownload",
      "contentUrl": "https://example.org/data.json",
      "encodingFormat": "application/json"
    }
  ]
}
```

**How to create:**
1. Add "distribution" property
2. Click "Add Reference/Object"
3. Create DataDownload object
4. Click "Convert to Array" on distribution
5. Click "Add Reference/Object" again for second distribution

### Pattern 4: Referenced Concepts

```json
{
  "@graph": [
    {
      "@type": "Dataset",
      "@id": "http://example.org/dataset/1",
      "subject": [
        { "@id": "http://example.org/concept/climate" },
        { "@id": "http://example.org/concept/ocean" }
      ]
    },
    {
      "@type": "Concept",
      "@id": "http://example.org/concept/climate",
      "prefLabel": "Climate Science"
    },
    {
      "@type": "Concept",
      "@id": "http://example.org/concept/ocean",
      "prefLabel": "Oceanography"
    }
  ]
}
```

**How to create:**
1. Create Concept nodes first (manually or via UI)
2. Add "subject" property to Dataset
3. Click "Add Reference/Object"
4. Select existing concept from dropdown
5. Repeat for additional references

## Tips and Best Practices

### SHACL Shape Design

✅ **Do:**
- Use descriptive `sh:name` values (shown in UI)
- Add `sh:description` for help text
- Specify `sh:datatype` for proper input types
- Use `sh:in` for controlled vocabularies
- Set `sh:minCount` for required fields

❌ **Don't:**
- Use SPARQL-based constraints (not supported in browser)
- Omit `sh:path` (required for property mapping)
- Use complex `sh:or` / `sh:and` logic (may not render well)

### Performance

- **Large files (>1MB):** May take a few seconds to parse
- **Many shapes:** Initial validation may take 1-2 seconds
- **Deep nesting:** Keep nesting levels reasonable (<5 levels)

### Browser Compatibility

- **Modern browsers:** Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript required:** No graceful degradation
- **Local storage:** Used for caching shapes (must be enabled)

### Limitations

- **SPARQL constraints:** Not supported (use Core SHACL only)
- **Named graphs:** Only `@graph` array supported
- **File size:** Practical limit ~10MB (browser memory constraints)
- **Concurrent editing:** Single user only (no real-time collaboration)

## Troubleshooting

**Problem:** Shapes don't load from URL

**Solution:** Check:
- URL returns Turtle format (not HTML)
- CORS headers enabled on server
- No syntax errors in Turtle file
- Network console for specific error

---

**Problem:** Properties show as EXTRA but should be in shapes

**Solution:**
- Verify `sh:path` exactly matches JSON-LD property key
- Check namespace prefixes match `@context`
- Try expanded form if prefixed form doesn't match

---

**Problem:** Can't add complex property

**Solution:**
- Ensure SHACL shape has `sh:node` or `sh:class`
- Check that target class has a NodeShape definition
- Verify blank nodes aren't blocked by validation rules

---

**Problem:** Validation always shows errors

**Solution:**
- Check SHACL shapes are valid (test with pySHACL)
- Verify your JSON-LD structure matches shape expectations
- Look at specific violation messages for clues

## Further Resources

- **JSON-LD Playground:** https://json-ld.org/playground/
- **SHACL Playground:** https://shacl.org/playground/
- **W3C SHACL Spec:** https://www.w3.org/TR/shacl/
- **W3C JSON-LD Spec:** https://www.w3.org/TR/json-ld11/
- **schema.org:** https://schema.org/
- **DCAT Vocabulary:** https://www.w3.org/TR/vocab-dcat-3/

## Getting Help

- **GitHub Issues:** https://github.com/libis/cdi-viewer/issues
- **Documentation:** See main [README.md](../README.md)
- **Examples:** See `examples/` directory for DDI-CDI samples

---

**Made with ❤️ by LIBIS @ KU Leuven**
