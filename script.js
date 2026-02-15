// Global variables
var chart;
var index = 0;
var compact = 0;
var actNdCent = 0;

// 1. DATA SET
const data = [
  { id: 100, parentId: null, first_name: 'Steven', last_name: 'King', department_name: 'General Manager' },

  { id: 101, parentId: 100, first_name: 'Neena', last_name: 'Kochhar', department_name: 'Executive' },
  { id: 102, parentId: 100, first_name: 'Lex', last_name: 'De Haan', department_name: 'Executive' },
  { id: 103, parentId: 100, first_name: 'David', last_name: 'Austin', department_name: 'Operations' },
  { id: 104, parentId: 100, first_name: 'Sarah', last_name: 'Bell', department_name: 'HR' },
  { id: 201, parentId: 101, first_name: 'Nancy', last_name: 'Greenberg', department_name: 'Finance' },
  { id: 202, parentId: 100, first_name: 'Daniel', last_name: 'Faviet', department_name: 'Finance' },
  { id: 203, parentId: 101, first_name: 'John', last_name: 'Chen', department_name: 'Finance' },
  { id: 204, parentId: 202, first_name: 'Arun', last_name: 'Mehta', department_name: 'Finance' },
  { id: 205, parentId: 101, first_name: 'Priya', last_name: 'Shah', department_name: 'Finance' },
  { id: 301, parentId: 102, first_name: 'Alexander', last_name: 'Hunold', department_name: 'IT' },
  { id: 302, parentId: 301, first_name: 'Bruce', last_name: 'Ernst', department_name: 'IT' },
  { id: 303, parentId: 302, first_name: 'Valli', last_name: 'Pataballa', department_name: 'IT' },
  { id: 304, parentId: 101, first_name: 'Diana', last_name: 'Lorentz', department_name: 'IT' },
  { id: 305, parentId: 304, first_name: 'Kevin', last_name: 'Martin', department_name: 'IT' },
  { id: 306, parentId: 305, first_name: 'Ravi', last_name: 'Kumar', department_name: 'IT' },
  { id: 307, parentId: 101, first_name: 'Sneha', last_name: 'Iyer', department_name: 'IT' },
  { id: 401, parentId: 101, first_name: 'Michael', last_name: 'Scott', department_name: 'Operations' },
  { id: 402, parentId: 302, first_name: 'Dwight', last_name: 'Schrute', department_name: 'Operations' },
  { id: 403, parentId: 401, first_name: 'Jim', last_name: 'Halpert', department_name: 'Operations' },
  { id: 404, parentId: 402, first_name: 'Stanley', last_name: 'Hudson', department_name: 'Operations' },
  { id: 501, parentId: 104, first_name: 'Karen', last_name: 'Filippelli', department_name: 'HR' },
  { id: 502, parentId: 101, first_name: 'Oscar', last_name: 'Martinez', department_name: 'HR' },
  { id: 503, parentId: 501, first_name: 'Angela', last_name: 'Martin', department_name: 'HR' },
  { id: 504, parentId: 101, first_name: 'Phyllis', last_name: 'Vance', department_name: 'HR' }
];

// 2. DATA PRE-PROCESSING

// A. Handle Multiple Roots (Add Virtual Root if needed)
const rootNodes = data.filter(d => d.parentId === null);
if (rootNodes.length > 1) {
    const virtualRootId = 'virtual_root';
    data.push({
        id: virtualRootId,
        parentId: null,
        first_name: 'Organization',
        last_name: '',
        department_name: 'Headquarters'
    });
    rootNodes.forEach(node => {
        node.parentId = virtualRootId;
    });
}

// B. Calculate TOTAL Subordinates (Recursive)
// First, create a map of Parent ID -> Array of Children IDs
const parentToChildren = {};
data.forEach(d => {
    if (d.parentId) {
        if (!parentToChildren[d.parentId]) {
            parentToChildren[d.parentId] = [];
        }
        parentToChildren[d.parentId].push(d.id);
    }
});

// Recursive function to count all descendants
function countTotalSubordinates(id) {
    const childrenIds = parentToChildren[id] || [];
    let count = childrenIds.length; // Start with direct children
    
    childrenIds.forEach(childId => {
        count += countTotalSubordinates(childId); // Add their children's children
    });
    
    return count;
}

// Apply count to every node
data.forEach(d => {
    d._totalSubordinates = countTotalSubordinates(d.id);
});


// C. Color Inheritance Logic
function processColors(data) {
    const colorPalette = [
        '#3b82f6', // Blue
        '#10b981', // Emerald Green
        '#8b5cf6', // Violet
        '#f59e0b', // Amber/Orange
        '#ec4899', // Pink
        '#06b6d4'  // Cyan
    ];
    
    const nodeMap = {};
    data.forEach(d => nodeMap[d.id] = d);

    const rootNode = data.find(d => d.parentId === null);
    const rootId = rootNode ? rootNode.id : null;
    
    let colorIndex = 0;
    const branchColors = {}; 

    data.forEach(d => {
        // We assign colors to the direct children of the Root
        if (d.parentId === rootId) {
            branchColors[d.id] = colorPalette[colorIndex % colorPalette.length];
            colorIndex++;
        }
    });

    function getBranchColor(node) {
        if (node.id === rootId) return '#2c3e50'; 
        if (branchColors[node.id]) return branchColors[node.id]; 
        
        let current = node;
        while (current.parentId && current.parentId !== rootId) {
            current = nodeMap[current.parentId];
            if (!current) break; 
        }
        
        if (current && branchColors[current.id]) {
            return branchColors[current.id];
        }
        
        return '#cbd5e0';
    }

    data.forEach(d => {
        d._borderColor = getBranchColor(d);
    });
}

processColors(data);

// 3. RENDER CHART
document.addEventListener('DOMContentLoaded', () => {
    chart = new d3.OrgChart()
      .container('.chart-container')
      .data(data)
      .nodeHeight((d) => 100)
      .nodeWidth((d) => 220)
      .childrenMargin((d) => 50)
      .compactMarginBetween((d) => 25)
      .compactMarginPair((d) => 50)
      .neightbourMargin((a, b) => 25)
      .siblingsMargin((d) => 25)
      
      .buttonContent(({ node, state }) => {
        return `<div style="
            color:#718096;
            background-color:#ffffff;
            border-radius:50%;
            width:20px;
            height:20px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin-top: 10px;
            margin-left: 9px;
            font-size:10px;
            cursor:pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border: 1px solid #cbd5e0;"> 
            <span style="font-size:8px">
              ${node.children ? `<i class="fas fa-chevron-up"></i>` : `<i class="fas fa-chevron-down"></i>`}
            </span>
        </div>`;
      })

      .linkUpdate(function (d, i, arr) {
        d3.select(this)
          .attr('stroke', (d) => d.data._borderColor)
          .attr('stroke-width', (d) => d.data._upToTheRootHighlighted ? 3 : 1.5);

        if (d.data._upToTheRootHighlighted) {
          d3.select(this).raise();
        }
      })

      .nodeContent(function (d, i, arr, state) {
        const color = d.data._borderColor;
        const isVirtualRoot = d.data.id === 'virtual_root';

        // Special Styling for the Virtual Root
        if (isVirtualRoot) {
            return `
            <div style="
                font-family: 'Inter', sans-serif; 
                background-color:#2c3e50; 
                position:absolute; margin-top:-1px; margin-left:-1px; 
                width:${d.width}px; height:${d.height}px; 
                border-radius:8px; 
                display:flex; flex-direction:column; justify-content:center; align-items:center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <div style="font-size:16px; color:#ffffff; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                    ${d.data.first_name}
                </div>
                <div style="font-size:12px; color:#cbd5e0; margin-top:4px;">
                    Total Reports: ${d.data._totalSubordinates}
                </div>
            </div>`;
        }

        // Standard Card Styling
        return `
          <div style="
              font-family: 'Inter', sans-serif; 
              background-color:#FFFFFF; 
              position:absolute; 
              margin-top:-1px; 
              margin-left:-1px; 
              width:${d.width}px; 
              height:${d.height}px; 
              border-radius:8px; 
              border: 1px solid ${color};
              border-top: 4px solid ${color};
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              display:flex; 
              flex-direction:column; 
              justify-content:center; 
              align-items:center;
          ">
              <div style="font-size:15px; color:#1f2937; font-weight:600; margin-bottom:4px;">
                ${d.data.first_name} ${d.data.last_name}
              </div>
              <div style="font-size:12px; color:#64748b; margin-bottom:8px;">
                ${d.data.department_name}
              </div>
              <div style="
                  font-size:11px; 
                  color: ${color}; 
                  background-color: #f8fafc;
                  border: 1px solid ${color}40;
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-weight: 600;
              ">
                Total Reports: ${d.data._totalSubordinates}
              </div>
          </div>
        `;
      })
      .nodeUpdate(function (d, i, arr) {
        d3.select(this)
          .select('.node-rect')
          .attr('stroke', (d) => d.data._borderColor)
          .attr('stroke-width', d.data._highlighted || d.data._upToTheRootHighlighted ? 4 : 1);
      })
      .render();
});