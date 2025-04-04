// Constants
const SHEET_ID = "1x6aJpjxxsb_-TWj-42QgpOGXleo8rbemAy95CrEmyI4";
const API_KEY = "AIzaSyCCwc-JlFK_c2ZBaXC9nvE6MVa2HmcaExM";
const RANGE = "Sheet1!A1:AK1000";
let data = [];
let selectedDepartment = "";

// Initialize the page based on which page we're on
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('departmentFilter')) {
    // We're on the index page
    fetchData().then(() => {
      populateDropdown();
      setupEventListeners();
    });
  } else if (document.getElementById('details')) {
    // We're on the about page
    fetchDataForAbout();
  }
});

// Fetch data from Google Sheets
async function fetchData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    const result = await response.json();
    data = result.values.map(row => 
      row.map(cell => 
        cell ? String(cell).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : ""
      )
    );
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    if (document.getElementById('peopleList')) {
      document.getElementById("peopleList").innerHTML = "<p class='no-results'>Error loading data. Please check the console.</p>";
    }
    return null;
  }
}

// Fetch data for the about page
function fetchDataForAbout() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`;
  fetch(url)
    .then(response => response.json())
    .then(result => {
      data = result.values;
      displayDetails();
    })
    .catch(error => {
      console.error("Error fetching data:", error);
      document.getElementById("details").innerHTML = "<p>Error loading data. Please try again later.</p>";
    });
}

// Populate dropdown with unique Board/Commission/Department values
function populateDropdown() {
  const departmentFilter = document.getElementById("departmentFilter");
  const boardColumnIndex = 8; // Column I
  const uniqueBoards = new Set();

  for (let i = 1; i < data.length; i++) {
    const board = data[i][boardColumnIndex];
    if (board) uniqueBoards.add(board);
  }

  uniqueBoards.forEach(board => {
    const option = document.createElement("option");
    option.value = board;
    option.textContent = board;
    departmentFilter.appendChild(option);
  });
}

// Setup all event listeners for index page
function setupEventListeners() {
  setupSearch();
  setupDepartmentFilter();
}

// Search functionality
function setupSearch() {
  const searchBar = document.getElementById("search");
  const resultsContainer = document.getElementById("search-results");

  searchBar.addEventListener("input", performSearch);
  
  // Close search results when clicking outside
  document.addEventListener("click", function(event) {
    if (!event.target.closest("#search") && !event.target.closest("#search-results")) {
      resultsContainer.innerHTML = "";
    }
  });

  function performSearch(event) {
    const query = event.target.value.toLowerCase();
    resultsContainer.innerHTML = "";
    if (!query) return;

    const nameIndex = 0; // Column A
    const titleIndex = 6; // Column G
    const departmentIndex = 8; // Column I

    let results = data.slice(1);
    
    // Filter by department if one is selected
    if (selectedDepartment) {
      results = results.filter(row => row[departmentIndex] === selectedDepartment);
    }
    
    // Filter by search query
    results = results.filter(row => row[nameIndex].toLowerCase().includes(query));
    
    if (results.length === 0) {
      const div = document.createElement("div");
      div.className = "no-results";
      div.textContent = "No results found";
      resultsContainer.appendChild(div);
      return;
    }
    
    // Group results by name to avoid duplicates
    const groupedResults = groupResultsByName(results);
    
    // Display limited number of results
    const maxResults = 10;
    const groupedResultsArray = Object.values(groupedResults);
    
    groupedResultsArray.slice(0, maxResults).forEach(personData => {
      const div = document.createElement("div");
      div.className = "result-item";
      
      // Use the name from the first entry
      const nameSpan = document.createElement("span");
      nameSpan.textContent = personData.name;
      div.appendChild(nameSpan);
      
      // Create container for all titles
      const titlesContainer = document.createElement("div");
      
      // Show first title inline
      if (personData.positions.length > 0) {
        const firstTitleSpan = document.createElement("span");
        firstTitleSpan.className = "person-title";
        firstTitleSpan.textContent = personData.positions[0].title;
        titlesContainer.appendChild(firstTitleSpan);
      }
      
      // Show count of additional positions if more than one
      if (personData.positions.length > 1) {
        const additionalPositionsSpan = document.createElement("span");
        additionalPositionsSpan.className = "additional-positions";
        additionalPositionsSpan.textContent = ` (+${personData.positions.length - 1} more positions)`;
        titlesContainer.appendChild(additionalPositionsSpan);
      }
      
      div.appendChild(titlesContainer);
      
      div.onclick = () => {
        // Store all rows for this person
        localStorage.setItem("selectedPersonRows", JSON.stringify(personData.rows));
        window.location.href = "about.html";
      };
      
      resultsContainer.appendChild(div);
    });
    
    if (groupedResultsArray.length > maxResults) {
      const div = document.createElement("div");
      div.className = "result-item";
      div.textContent = `...and ${groupedResultsArray.length - maxResults} more results`;
      resultsContainer.appendChild(div);
    }
  }
  
  // Helper function to group results by name
  function groupResultsByName(results) {
    const groupedResults = {};
    const nameIndex = 0; // Column A
    const titleIndex = 6; // Column G
    const departmentIndex = 8; // Column I
    
    results.forEach(row => {
      const name = row[nameIndex];
      if (!groupedResults[name]) {
        groupedResults[name] = {
          name: name,
          positions: [],
          rows: []
        };
      }
      
      groupedResults[name].positions.push({
        title: row[titleIndex] || "No Title",
        department: row[departmentIndex] || "Unknown Department"
      });
      
      groupedResults[name].rows.push(row);
    });
    
    return groupedResults;
  }
}

// Department filter functionality
function setupDepartmentFilter() {
  const departmentFilter = document.getElementById("departmentFilter");
  const peopleList = document.getElementById("peopleList");
  const searchBar = document.getElementById("search");

  departmentFilter.addEventListener("change", function() {
    selectedDepartment = this.value;
    peopleList.innerHTML = "";
    
    // Clear search results and trigger search if there's text in the search box
    if (searchBar.value) {
      searchBar.dispatchEvent(new Event('input'));
      return;
    }

    // If no department is selected, clear the list
    if (!selectedDepartment) return;

    // Display people in the selected department
    displayPeopleInDepartment(selectedDepartment);
  });
}

// Display people in the selected department
function displayPeopleInDepartment(department) {
  const peopleList = document.getElementById("peopleList");
  const nameColumnIndex = 0; // Column A
  const titleColumnIndex = 6; // Column G
  const departmentColumnIndex = 8; // Column I

  const allPeople = data.slice(1).filter(row => row[departmentColumnIndex] === department);

  if (allPeople.length === 0) {
    peopleList.innerHTML = "<p class='no-results'>No people found in this department.</p>";
    return;
  }

  // Group people by name
  const groupedPeople = {};
  allPeople.forEach(person => {
    const name = person[nameColumnIndex];
    if (!groupedPeople[name]) {
      groupedPeople[name] = {
        name: name,
        positions: [],
        rows: []
      };
    }
    
    groupedPeople[name].positions.push({
      title: person[titleColumnIndex] || "No Title",
      department: person[departmentColumnIndex] || "Unknown Department"
    });
    
    groupedPeople[name].rows.push(person);
  });

  // Display grouped people
  peopleList.innerHTML = '';
  Object.values(groupedPeople).forEach(personData => {
    const personDiv = document.createElement("div");
    personDiv.className = "person";
    
    const nameLink = document.createElement("a");
    nameLink.textContent = personData.name;
    personDiv.appendChild(nameLink);
    
    // Display first position
    if (personData.positions.length > 0) {
      const titleSpan = document.createElement("span");
      titleSpan.className = "person-title";
      titleSpan.textContent = personData.positions[0].title;
      personDiv.appendChild(titleSpan);
      
      // Show count if more than one position
      if (personData.positions.length > 1) {
        const additionalPositionsSpan = document.createElement("span");
        additionalPositionsSpan.className = "additional-positions";
        additionalPositionsSpan.textContent = ` (+${personData.positions.length - 1} more positions)`;
        titleSpan.appendChild(additionalPositionsSpan);
      }
    }
    
    nameLink.addEventListener("click", () => {
      localStorage.setItem("selectedPersonRows", JSON.stringify(personData.rows));
      window.location.href = "about.html";
    });
    
    peopleList.appendChild(personDiv);
  });
}

// Display details for the about page
function displayDetails() {
  const detailsContainer = document.getElementById("details");
  if (!detailsContainer) return; // Not on the about page
  
  // Get all rows for this person
  const rows = JSON.parse(localStorage.getItem("selectedPersonRows") || "[]");
  
  if (!rows.length) {
    // Try legacy storage format for backward compatibility
    const singleRow = JSON.parse(localStorage.getItem("selectedPerson") || "null");
    if (singleRow) {
      rows.push(singleRow);
    }
  }
  
  if (!rows.length) {
    detailsContainer.innerHTML = "<p>No data available. Please go back and select a person.</p>";
    return;
  }
  
  // Use the name from the first row
  const nameColumnIndex = 0;
  const name = rows[0][nameColumnIndex] || "Unknown";
  
  let detailsHTML = `<h2>${name}</h2>`;
  
  // Prepare sections
  const positionInfo = [];
  const contactInfo = [];
  const personalInfo = [];
  const otherInfo = [];
  
  // Dictionary to track which fields we've already processed
  // to avoid duplicates across different positions
  const processedFields = {
    titles: new Set(), // Track which title+department combos we've seen
    contacts: new Set(), // Track which contact info we've seen
    personal: new Set(), // Track which personal info we've seen
    other: new Set() // Track other fields we've seen
  };
  
  // Process each row (position) for this person
  rows.forEach(row => {
    const titleIndex = 6; // Column G - Title
    const departmentIndex = 8; // Column I - Board/Commission/Department
    
    // Process position information first
    const title = row[titleIndex] || "No Title";
    const department = row[departmentIndex] || "Unknown Department";
    const titleDeptKey = `${title}-${department}`;
    
    // Only add this position if we haven't seen it before
    if (!processedFields.titles.has(titleDeptKey)) {
      processedFields.titles.add(titleDeptKey);
      
      // Add all position-related information
      let positionHTML = `<div class="position-item">`;
      
      row.forEach((cell, index) => {
        if (!cell || cell.trim() === "" || !data[0][index]) return;
        
        const header = data[0][index];
        
        // Only add position-related fields
        if (["Title", "Board/Commission/Department", "Appointed By", "Appointment Date", "Term End"].includes(header)) {
          positionHTML += `<p><strong>${header}:</strong> ${cell}</p>`;
        }
      });
      
      positionHTML += `</div>`;
      positionInfo.push(positionHTML);
    }
    
    // Process non-position information
    row.forEach((cell, index) => {
      if (!cell || cell.trim() === "" || !data[0][index]) return;
      
      const header = data[0][index];
      const fieldKey = `${header}-${cell}`;
      
      // Skip position-related fields as they're handled separately
      if (["Title", "Board/Commission/Department", "Appointed By", "Appointment Date", "Term End"].includes(header)) {
        return;
      }
      
      // Skip name fields as they're used for the heading
      if (["Pre", "First", "Middle", "Last", "Suffix", "Name"].includes(header)) {
        return;
      }
      
      const item = `<p><strong>${header}:</strong> ${cell}</p>`;
      
      // Categorize and deduplicate other information
      if (["Address", "Email", "Phone", "Cell", "Fax", "Mobile", "Twitter"].includes(header)) {
        if (!processedFields.contacts.has(fieldKey)) {
          processedFields.contacts.add(fieldKey);
          contactInfo.push(item);
        }
      } else if (["Birth Month", "Birthday", "Birth Year", "Race", "Gender"].includes(header)) {
        if (!processedFields.personal.has(fieldKey)) {
          processedFields.personal.add(fieldKey);
          personalInfo.push(item);
        }
      } else {
        if (!processedFields.other.has(fieldKey)) {
          processedFields.other.add(fieldKey);
          otherInfo.push(item);
        }
      }
    });
  });
  
  // Add each section to the HTML if it has content
  if (positionInfo.length > 0) {
    detailsHTML += `<div class="detail-section">
      <h3>Position Information</h3>
      ${positionInfo.join("")}
    </div>`;
  }
  
  if (contactInfo.length > 0) {
    detailsHTML += `<div class="detail-section">
      <h3>Contact Information</h3>
      ${contactInfo.join("")}
    </div>`;
  }
  
  if (personalInfo.length > 0) {
    detailsHTML += `<div class="detail-section">
      <h3>Personal Information</h3>
      ${personalInfo.join("")}
    </div>`;
  }
  
  if (otherInfo.length > 0) {
    detailsHTML += `<div class="detail-section">
      <h3>Additional Information</h3>
      ${otherInfo.join("")}
    </div>`;
  }
  
  detailsContainer.innerHTML = detailsHTML;
}