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
    // Vibrant Modern Color Palette
    const colorPalette = [
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#8b5cf6', // Violet
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#3b82f6'  // Blue
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
        if (node.id === rootId) return '#1e293b'; // Dark slate for root
        if (branchColors[node.id]) return branchColors[node.id]; 
        
        let current = node;
        while (current.parentId && current.parentId !== rootId) {
            current = nodeMap[current.parentId];
            if (!current) break; 
        }
        
        if (current && branchColors[current.id]) {
            return branchColors[current.id];
        }
        
        return '#64748b'; // Default color
    }

    data.forEach(d => {
        d._borderColor = getBranchColor(d);
    });
}

processColors(data);

// Helper function to adjust color brightness
function adjustColorBrightness(color, amount) {
    const clamp = (num) => Math.min(255, Math.max(0, num));
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// 3. RENDER CHART
document.addEventListener('DOMContentLoaded', () => {
    chart = new d3.OrgChart()
      .container('.chart-container')
      .data(data)
      .nodeHeight((d) => 120)
      .nodeWidth((d) => 250)
      .childrenMargin((d) => 60)
      .compactMarginBetween((d) => 35)
      .compactMarginPair((d) => 60)
      .neightbourMargin((a, b) => 35)
      .siblingsMargin((d) => 35)
      
      .buttonContent(({ node, state }) => {
        const color = node.data._borderColor;
        return `<div style="
            color:#ffffff;
            background: linear-gradient(135deg, ${color}, ${adjustColorBrightness(color, -20)});
            border-radius:50%;
            width:28px;
            height:28px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin-top: 5px;
            margin-left: 10px;
            font-size:12px;
            cursor:pointer;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            border: 2px solid #ffffff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"> 
            <span style="font-size:10px">
              ${node.children ? `<i class="fas fa-chevron-up"></i>` : `<i class="fas fa-chevron-down"></i>`}
            </span>
        </div>`;
      })

      .linkUpdate(function (d, i, arr) {
        d3.select(this)
          .attr('stroke', (d) => d.data._borderColor)
          .attr('stroke-width', (d) => d.data._upToTheRootHighlighted ? 3.5 : 2.5)
          .attr('stroke-opacity', 0.8)
          .style('transition', 'all 0.3s ease');

        if (d.data._upToTheRootHighlighted) {
          d3.select(this).raise();
        }
      })

      .nodeContent(function (d, i, arr, state) {
        const color = d.data._borderColor;
        const lighterColor = adjustColorBrightness(color, 30);
        const isVirtualRoot = d.data.id === 'virtual_root';

        // Special Styling for the Virtual Root
        if (isVirtualRoot) {
            return `
            <div class="org-card org-card-root" style="
                font-family: 'Inter', sans-serif; 
                background: linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -30)} 100%);
                position:absolute; 
                margin-top:-1px; 
                margin-left:-1px; 
                width:${d.width}px; 
                height:${d.height}px; 
                border-radius:16px; 
                display:flex; 
                flex-direction:column; 
                justify-content:center; 
                align-items:center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1);
                border: 3px solid rgba(255,255,255,0.3);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;">
                <div style="font-size:20px; color:#ffffff; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">
                    ${d.data.first_name}
                </div>
                <div style="font-size:14px; color:rgba(255,255,255,0.9); margin-top:8px; font-weight:500;">
                    ${d.data._totalSubordinates} ${d.data._totalSubordinates === 1 ? 'Reporter' : 'Reportees'}
                </div>
            </div>`;
        }

        // Standard Card Styling - FULLY COLORED
        return `
          <div class="org-card" style="
              font-family: 'Inter', sans-serif; 
              background: linear-gradient(135deg, ${color} 0%, ${lighterColor} 100%);
              position:absolute; 
              margin-top:-1px; 
              margin-left:-1px; 
              width:${d.width}px; 
              height:${d.height}px; 
              border-radius:16px; 
              border: 3px solid ${color};
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.08);
              display:flex; 
              flex-direction:column; 
              justify-content:center; 
              align-items:center;
              padding: 20px;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
              position: relative;
              overflow: hidden;
          ">
              <!-- Shine effect on hover -->
              <div style="
                  position: absolute;
                  top: -50%;
                  left: -50%;
                  width: 200%;
                  height: 200%;
                  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                  transform: rotate(45deg);
                  pointer-events: none;
              "></div>
              
              <!-- Content -->
              <div style="position: relative; z-index: 1; text-align: center; width: 100%;">
                  <div style="
                      font-size:17px; 
                      color:#ffffff; 
                      font-weight:700; 
                      margin-bottom:6px;
                      line-height: 1.3;
                      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  ">
                    ${d.data.first_name} ${d.data.last_name}
                  </div>
                  <div style="
                      font-size:14px; 
                      color:rgba(255,255,255,0.95); 
                      margin-bottom:12px;
                      font-weight:500;
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                    ${d.data.department_name}
                  </div>
                  <div style="
                      font-size:13px; 
                      color: #ffffff; 
                      background: rgba(255, 255, 255, 0.25);
                      backdrop-filter: blur(10px);
                      border: 2px solid rgba(255, 255, 255, 0.4);
                      padding: 6px 14px;
                      border-radius: 20px;
                      font-weight: 700;
                      display: inline-block;
                      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                    ${d.data._totalSubordinates} ${d.data._totalSubordinates === 1 ? 'Reporter' : 'Reporters'}
                  </div>
              </div>
          </div>
        `;
      })
      .nodeUpdate(function (d, i, arr) {
        const nodeElement = d3.select(this);
        const cardElement = nodeElement.select('.org-card');
        
        // Add hover effect with dashed border
        cardElement.on('mouseenter', function() {
          d3.select(this)
            .style('transform', 'translateY(-8px) scale(1.03)')
            .style('box-shadow', '0 15px 40px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.12)')
            .style('border-style', 'dashed')
            .style('border-width', '3px');
        });
        
        cardElement.on('mouseleave', function() {
          d3.select(this)
            .style('transform', 'translateY(0) scale(1)')
            .style('box-shadow', '0 8px 20px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.08)')
            .style('border-style', 'solid')
            .style('border-width', '3px');
        });
        
        nodeElement
          .select('.node-rect')
          .attr('stroke', (d) => d.data._borderColor)
          .attr('stroke-width', d.data._highlighted || d.data._upToTheRootHighlighted ? 4 : 0)
          .attr('fill', 'transparent');
      })
      .render();
});