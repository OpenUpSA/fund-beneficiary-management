/**
 * Validation utilities for form responses
 */

/**
 * Validates if an email is in correct format
 * @param {string} email - Email to validate
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  return {
    valid: isValid,
    message: isValid ? '' : 'Please enter a valid email address'
  };
};

/**
 * Validates if a URL is in correct format
 * @param {string} url - URL to validate
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return {
      valid: true,
      message: ''
    };
  } catch {
    return {
      valid: false,
      message: 'Please enter a valid URL'
    };
  }
};

/**
 * Validates if a date string is valid
 * @param {string} dateStr - Date string to validate
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidDate = (dateStr) => {
  if (!dateStr) {
    return {
      valid: false,
      message: 'Date is required'
    };
  }
  const date = new Date(dateStr);
  const isValid = !isNaN(date.getTime());
  return {
    valid: isValid,
    message: isValid ? '' : 'Please enter a valid date'
  };
};

/**
 * Validates if a time string is valid (HH:MM format)
 * @param {string} timeStr - Time string to validate
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidTime = (timeStr) => {
  if (!timeStr) {
    return {
      valid: false,
      message: 'Time is required'
    };
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const isValid = timeRegex.test(timeStr);
  return {
    valid: isValid,
    message: isValid ? '' : 'Please enter a valid time in HH:MM format'
  };
};

/**
 * Validates if a number is valid
 * @param {string|number} value - Number to validate
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return {
      valid: false,
      message: 'Number is required'
    };
  }
  const isValid = !isNaN(Number(value));
  return {
    valid: isValid,
    message: isValid ? '' : 'Please enter a valid number'
  };
};

/**
 * Validates if a selection is valid
 * @param {string|Array} value - Selected value(s)
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidSelection = (value) => {
  let isValid = false;
  if (Array.isArray(value)) {
    isValid = value.length > 0;
  } else {
    isValid = value !== null && value !== undefined && value !== '';
  }
  return {
    valid: isValid,
    message: isValid ? '' : 'Please make a selection'
  };
};

/**
 * Validates if checkbox selections are valid
 * @param {Array|boolean} value - Checkbox value(s)
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidCheckbox = (value) => {
  let isValid = false;
  if (Array.isArray(value)) {
    isValid = value.length > 0;
  } else {
    isValid = value === true;
  }
  return {
    valid: isValid,
    message: isValid ? '' : 'This field is required'
  };
};

/**
 * Validates a customer detail object
 * @param {Object} customerDetail - Customer detail object
 * @param {Object} schema - Schema defining required fields
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidCustomerDetail = (customerDetail, schema) => {
  if (!customerDetail || typeof customerDetail !== 'object') {
    return {
      valid: false,
      message: 'Invalid customer details format'
    };
  }

  // Check each field in the schema
  for (const field in schema) {
    const fieldSchema = schema[field];
    const fieldValue = customerDetail[field];
    
    // Check if required field is present
    if (fieldSchema.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      return {
        valid: false,
        message: `${field} is required`
      };
    }
    
    // If field has a value, validate it based on its type
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      const validation = isValidByType(fieldValue, fieldSchema.type, fieldSchema);
      if (!validation.valid) {
        return {
          valid: false,
          message: `${field}: ${validation.message}`
        };
      }
    }
  }
  
  return {
    valid: true,
    message: ''
  };
};

/**
 * Validates a value based on its type
 * @param {any} value - Value to validate
 * @param {string} type - Type of the value
 * @param {Object} fieldSchema - Additional schema information
 * @returns {Object} - Object with valid status and message if invalid
 */
const isValidByType = (value, type, fieldSchema = {}) => {
  switch (type) {
    case 'text':
      return typeof value === 'string' ? 
        { valid: true, message: '' } : 
        { valid: false, message: 'Text must be a string' };
    case 'number':
      return isValidNumber(value);
    case 'date':
      return isValidDate(value);
    case 'time':
      return isValidTime(value);
    case 'email':
      return isValidEmail(value);
    case 'weblink':
      return isValidUrl(value);
    case 'select':
      return isValidSelection(value);
    case 'radio':
      return isValidSelection(value);
    case 'checkbox':
      return isValidCheckbox(value);
    case 'customerDetail':
      return isValidCustomerDetail(value, fieldSchema.schema || {});
    default:
      return { valid: true, message: '' }; // For unknown types, assume valid
  }
};

/**
 * Main validation function that checks if a response is valid for a given field
 * @param {any} response - The response value to validate
 * @param {Object} field - Field definition with type, required status, etc.
 * @returns {Object} - Object with valid status and message if invalid
 */
const validateResponse = (response, field) => {
  // Case 1: If field is required and response is empty
  if (field.required && (response === undefined || response === null || response === '')) {
    return {
      valid: false,
      message: field.errorMessage || `${field.label || 'This field'} is required`
    };
  }
  
  // Case 2 & 3: If field is not required
  if (!field.required) {
    // If response is empty, it's valid for non-required fields
    if (response === undefined || response === null || response === '') {
      return {
        valid: true,
        message: ''
      };
    }
    // If response is not empty, it still needs to be valid for the input type
  }
  
  // Case 4 & 5: Check if response is valid for the input type
  const typeValidation = isValidByType(response, field.type, field);
  
  // If there's a custom error message defined in the field, use it
  if (!typeValidation.valid && field.errorMessage) {
    return {
      valid: false,
      message: field.errorMessage
    };
  }
  
  return typeValidation;
};

export {
  validateResponse,
  isValidEmail,
  isValidUrl,
  isValidDate,
  isValidTime,
  isValidNumber,
  isValidSelection,
  isValidCheckbox,
  isValidCustomerDetail,
  isValidByType
};
