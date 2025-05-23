document.addEventListener('DOMContentLoaded', function () {
  // Select all buttons
  const optionButtons = document.getElementsByClassName('option-btn');
  const planButtons = document.getElementsByClassName('plan-selector-btn');
  const priceTotalElement = document.querySelector('.price-total');
  const priceTotalCompareAtContainer = document.querySelector(
    '.price-display-compare',
  );
  const priceTotalCompareAtElement =
    document.querySelector('.price-compare-at');
  const priceDiscountAmountElement = document.querySelector('.price-discount-amount');
  const priceDiscountAmountCountElement = document.querySelector('.price-discount-amount-count');
  const quantityTotalElement = document.querySelector('.total-quantity-couunt');
  const singleItemPriceElement = document.querySelector(
    '.single-item-price-count',
  );
  const unitPriceDisplayElement = document.querySelector('.unit-price-display');
  const quantityBreakCounterElement = document.querySelector(
    '.quantity-break-counter',
  );
  const quantityBreakProgressBar = document.querySelector(
    '.quantity-break-progress-bar',
  );
  const quantityBreakTargetElement = document.querySelector(
    '.quantity-break-target',
  );
  const quantityBreakAppliedElement = document.querySelector(
    '.quantity-break-applied',
  );

  let currentPlan = '';
  let quantityBreakTarget = parseInt(window.ur_quantity_break_target);
  let can400gFreeCount = 0;
  let cookies200gFreeCount = 0;
  let can400gFreeCountAvailable = 0;
  let cookies200gFreeCountAvailable = 0;
  let additionalItems = [];
  let currentDiscount = 0;

  const loadingModal = document.getElementById('ur-loading-modal');

  function getParameterByName(name, url = window.location.href) {
    let params = new URL(url).searchParams;
    return params.get(name);
  }

  function checkForRecommendation() {
    //check if GET PARAM canSize is set and get an
    const canSize = getParameterByName('canSize');
    const recommendationString = getParameterByName('recommendation');

    if (canSize) {
      for (let i = 0; i < optionButtons.length; i++) {
        const optionButton = optionButtons[i];
        const option = optionButton.getAttribute('data-option');
        if (option === canSize) {
          optionButton.classList.add('active');
          window.ur_selected_variant_option = canSize;
          setVariantOption(canSize);
        } else {
          optionButton.classList.remove('active');
        }
      }

      if (recommendationString) {
        //Split recommendation string into array
        const recommendationArray = recommendationString.split('-');
        recommendationArray.forEach((recommendation) => {
          const id = recommendation.split('*')[0];
          const count = recommendation.split('*')[1];

          const input = document.querySelector(
            "input[data-product-option-id='" + id + '-' + canSize + "'",
          );
          console.log(input);
          if (input) {
            console.log(input.value);
            input.value = Number(count);
            console.log(input.value);
          }
        });

        document.querySelector('#questionnaire-cta').classList.add('xhidden');
        calculateTotal();
      }
    } else {
      calculateTotal();
    }
  }

  function getVariantItems() {
    // Only select variants from the main collection, not from the modal
    const variantElements = document.querySelectorAll('.main-collection-select .variant, .additives-collection-select .variant');
    let itemsToAdd = [];

    for (let i = 0; i < variantElements.length; i++) {
      const variantElement = variantElements[i];
      const variantId =
        variantElement.getElementsByClassName('variant-id')[0].value;
      const quantity =
        variantElement.getElementsByClassName('variant-quantity')[0].value;
      const variantCollection = variantElement
        .getElementsByClassName('variant-id')[0]
        .getAttribute('data-collection');

      itemsToAdd.push({
        id: variantId,
        quantity: quantity,
        selling_plan: currentPlan,
        collection: variantCollection,
      });
    }
    return itemsToAdd;
  }

  function calculateTotal() {
    const itemsToAdd = getVariantItems();

    let totalPrice = 0;
    let totalPriceOriginal = 0;
    let totalQuantity = 0;
    let singleItemPrice = 0;
    let unitPrice = 0;

    // Calculate totals from items
    for (let i = 0; i < itemsToAdd.length; i++) {
      const item = itemsToAdd[i];
      const variant = window.ur_subscription_variants[item.id];
      let itemPriceOriginal = variant.price;
      let itemPrice = itemPriceOriginal;
      if (variant.option1 === window.ur_selected_variant_option) {
        singleItemPrice = itemPrice;
        unitPrice = variant.unit_price;
      }

      if (currentPlan && currentPlan !== '') {
        for (let j = 0; j < variant.selling_plan_allocations.length; j++) {
          const plan = variant.selling_plan_allocations[j];
          if (plan.selling_plan_id == currentPlan) {
            itemPrice = plan.price;
            if (variant.option1 === window.ur_selected_variant_option) {
              singleItemPrice = plan.price;
            }
          }
        }
      }
      
      totalPriceOriginal = totalPriceOriginal + itemPriceOriginal * item.quantity;
      totalPrice = totalPrice + itemPrice * item.quantity;
      if (item.collection === 'main') {
        totalQuantity = totalQuantity + parseInt(item.quantity);
      }
    }

    // Handle promo breaks if they exist
    if (window.ur_promo_breaks && window.ur_promo_breaks.length > 0) {
      // Sort promo breaks by target value descending
      const sortedPromoBreaks = [...window.ur_promo_breaks];
      
      // Find the next applicable promo break
      const nextPromoBreak = sortedPromoBreaks.find(promo => promo.target > totalQuantity);
      const currentPromoBreak = sortedPromoBreaks.find(promo => promo.target <= totalQuantity);
      const allPrevPromoBreaks = sortedPromoBreaks.filter(promo => promo.target <= totalQuantity);

      // console.log("sortedPromoBreaks", sortedPromoBreaks);
      // console.log("nextPromoBreak", nextPromoBreak);
      // console.log("currentPromoBreak", currentPromoBreak);
      // console.log("allPrevPromoBreaks", allPrevPromoBreaks);

      can400gFreeCount = 0;
      cookies200gFreeCount = 0;
      can400gFreeCountAvailable = 0;
      cookies200gFreeCountAvailable = 0;
      for (let i = 0; i < allPrevPromoBreaks.length; i++) {
        const promo = allPrevPromoBreaks[i];
        if (promo.couponType === 'percent_discount' && promo.amount) {
          totalPrice = totalPrice - (totalPrice * (promo.amount / 100));
          currentDiscount = promo.amount;
        } else if (promo.couponType === '400g_can_free') {
          can400gFreeCount = can400gFreeCount + promo.amount;
          can400gFreeCountAvailable = can400gFreeCountAvailable + promo.amount;
        } else if (promo.couponType === '200g_cookies_free') {
          cookies200gFreeCount = cookies200gFreeCount + promo.amount;
          cookies200gFreeCountAvailable = cookies200gFreeCountAvailable + promo.amount;
        }
      } 

      if (nextPromoBreak) {
        // Show progress towards next break
        const quantityBreakCounter = nextPromoBreak.target - totalQuantity;
        quantityBreakCounterElement.innerHTML = quantityBreakCounter;
        const percent = Math.floor((totalQuantity / nextPromoBreak.target) * 100);
        quantityBreakProgressBar.style.width = percent + '%';
        quantityBreakTargetElement.classList.remove('xhidden');
        quantityBreakAppliedElement.classList.add('xhidden');
        
        // Update the target text - replace {COUNTER} with actual value
        console.log(nextPromoBreak.text);
        console.log(nextPromoBreak);
        let targetText = nextPromoBreak.text || `Füge ${quantityBreakCounter} Dosen hinzu um weitere 5% zu sparen!`;
        targetText = targetText.replace('{COUNTER}', quantityBreakCounter);
        console.log(targetText);
        
        const textContainer = document.querySelector('.quantity-break-text');
        console.log(textContainer);
        if (textContainer) {
          textContainer.innerHTML = targetText;
        }
      } else if (currentPromoBreak) {
        // Highest break reached
        quantityBreakTargetElement.classList.add('xhidden');
        quantityBreakAppliedElement.classList.remove('xhidden');
        
        
      }
    } else {
      // Fallback to original behavior if no promo breaks configured
      const quantityBreakCounter = quantityBreakTarget - totalQuantity;
      if (quantityBreakCounter > 0) {
        quantityBreakCounterElement.innerHTML = quantityBreakCounter;
        const percent = Math.floor((totalQuantity / quantityBreakTarget) * 100);
        quantityBreakProgressBar.style.width = percent + '%';
        quantityBreakTargetElement.classList.remove('xhidden');
        quantityBreakAppliedElement.classList.add('xhidden');
      } else {
        quantityBreakTargetElement.classList.add('xhidden');
        quantityBreakAppliedElement.classList.remove('xhidden');
        totalPrice = totalPrice - totalPrice * 0.05;
      }
    }

    // Update display elements
    priceTotalElement.innerHTML = (totalPrice / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });

    if (totalPrice != totalPriceOriginal) {
      priceTotalCompareAtContainer.classList.remove('xhidden');
      priceTotalCompareAtElement.innerHTML = (totalPriceOriginal / 100).toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
    } else {
      priceTotalCompareAtContainer.classList.add('xhidden');
    }

    quantityTotalElement.innerHTML = totalQuantity;
    singleItemPriceElement.innerHTML = (totalPrice / totalQuantity / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });

    let unitPriceFormat = (unitPrice / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    unitPriceDisplayElement.innerHTML = unitPriceFormat;

    if(parseInt(priceDiscountAmountCountElement.innerHTML) < currentDiscount) {
      const jsConfetti = new JSConfetti()
      jsConfetti.addConfetti({
        confettiRadius: 5,
        confettiNumber: 180,
      })
      priceDiscountAmountElement.animate([
        { transform: 'scale(1.5) translateY(-5px) translateX(10px)', offset: 0.15 },
        { transform: 'scale(1) translateY(0px) translateX(0px)', offset: 1 }
      ], {
        duration: 1000,
        iterations: 1,
        fill: 'forwards',
        easing: 'ease-in-out'
      });
    }

    priceDiscountAmountCountElement.innerHTML = currentDiscount;

    if (can400gFreeCount > 0) {
      document.querySelector('.free-400g-can').classList.remove('xhidden');

    } else {
      document.querySelector('.free-400g-can').classList.add('xhidden');
    }

    if (cookies200gFreeCount > 0) {
      document.querySelector('.free-200g-cookies').classList.remove('xhidden');
    } else {
      document.querySelector('.free-200g-cookies').classList.add('xhidden');
    }

    if(parseInt(document.querySelector('.free-400g-can-count').innerHTML) < can400gFreeCount) {
      const jsConfetti = new JSConfetti()
      jsConfetti.addConfetti({
        confettiRadius: 5,
        confettiNumber: 180,
      })
      document.querySelector('.free-400g-can-anim').animate(
        [
          { transform: 'scale(2.5) translateY(-5px) translateX(-10px)', offset: 0.15 },
          { transform: 'scale(1) translateY(0px) translateX(0px)', offset: 1 }
        ], {
          duration: 1000,
          iterations: 1,
          fill: 'forwards',
          easing: 'ease-in-out'
        }
      );
    }
    document.querySelector('.free-400g-can-count').innerHTML = can400gFreeCount;


    if(parseInt(document.querySelector('.free-200g-cookies-count').innerHTML) < cookies200gFreeCount) {
      const jsConfetti = new JSConfetti()
      jsConfetti.addConfetti({
        confettiRadius: 5,
        confettiNumber: 180,
      })
      document.querySelector('.free-200g-cookies-anim').animate(
        [
          { transform: 'scale(2.5) translateY(-5px) translateX(-10px)', offset: 0.15 },
          { transform: 'scale(1) translateY(0px) translateX(0px)', offset: 1 }
        ], {
          duration: 1000,
          iterations: 1,
          fill: 'forwards',
          easing: 'ease-in-out'
        }
      );
    }
    document.querySelector('.free-200g-cookies-count').innerHTML = cookies200gFreeCount;


  }

  async function applyQuantityBreakCoupons(totalQuantity) {
    if (!window.ur_promo_breaks || window.ur_promo_breaks.length === 0) return;

    // Sort promo breaks by target value descending to apply highest breaks first
    const applicableBreaks = window.ur_promo_breaks
      .filter(promo => promo.target <= totalQuantity && promo.coupon)
      .sort((a, b) => b.target - a.target);
    
    // Get the highest applicable coupon
    const highestBreak = applicableBreaks[0];
    
    // If we have a new highest break that's different from what's currently applied
    if (highestBreak) {
      console.log(`Applying highest coupon: ${highestBreak.coupon} for break target: ${highestBreak.target}`);

      // Apply the new highest coupon
      await fetch(`/discount/${highestBreak.coupon}`);
   
    }
    
  }

  //Send Cart Form
  document
    .getElementById('add-box-to-cart-form')
    .addEventListener('submit', function (event) {
      event.preventDefault();
      handleAddToCart();
      
    });

  async function handleAddToCart() {
    itemsToAdd = getVariantItems();

    // const data = {
    //   items: itemsToAdd,
    // };

    // Only check for free cans if we haven't already added cookies
    if(can400gFreeCountAvailable > 0 && additionalItems.length === 0) {
      handle400gModal.openModal(can400gFreeCountAvailable);
      return;
    }
    
    // Only check for free cookies if we haven't already added them
    if(cookies200gFreeCountAvailable > 0 && !additionalItems.some(item => item.isCookie)) {
      handleCookiesModal.openModal(cookies200gFreeCountAvailable);
      return;
    }

    // If we've passed the free item checks, NOW show the loading modal and proceed to add to cart
    loadingModal.classList.remove('xhidden'); 

    const data = {
      items: itemsToAdd,
    };

    if(additionalItems.length > 0) {
      for(let i = 0; i < additionalItems.length; i++) {
        data.items.push({
          id: additionalItems[i].variantId,
          quantity: additionalItems[i].quantity,
          selling_plan: '', // Assuming free items don't have selling plans
          collection: '', // Assuming collection isn't relevant for free items here, or set appropriately if needed
        });
      }
    }

    try {
      // Finally add items to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.log("response", response);
        throw new Error('Network response was not ok');
      }

      const totalQuantity = itemsToAdd.reduce((sum, item) => sum + parseInt(item.quantity), 0);
      applyQuantityBreakCoupons(totalQuantity);

      // Force cart update to ensure discounts are visible
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: {},
        }),
      });

      loadingModal.querySelector('.loading-text').innerHTML = 'Redirecting to cart...';
      


      // Redirect to cart
      window.location.href = '/cart';

    } catch (error) {
      console.error('Error during cart operations:', error);
    }
  }

  function decrement(e) {
    const btn = e.target.parentNode.parentElement.querySelector(
      'button[data-action="decrement"]',
    );
    const target = btn.nextElementSibling;
    let value = Number(target.value);
    value--;
    if (value >= 0) {
      target.value = value;
      calculateTotal();
    }
  }

  function increment(e) {
    const btn = e.target.parentNode.parentElement.querySelector(
      'button[data-action="decrement"]',
    );
    const target = btn.nextElementSibling;
    let value = Number(target.value);
    value++;
    target.value = value;
    calculateTotal();
  }

  const decrementButtons = document.querySelectorAll(
    `button[data-action="decrement"]`,
  );

  const incrementButtons = document.querySelectorAll(
    `button[data-action="increment"]`,
  );

  decrementButtons.forEach((btn) => {
    btn.addEventListener('click', decrement);
  });

  incrementButtons.forEach((btn) => {
    btn.addEventListener('click', increment);
  });

  // Selling Plan Buttons
  for (let i = 0; i < planButtons.length; i++) {
    planButtons[i].addEventListener('click', function (event) {
      currentPlan = this.getAttribute('data-plan');
      for (var j = 0; j < planButtons.length; j++) {
        planButtons[j].classList.remove('active');
      }
      this.classList.add('active');
      calculateTotal();
    });
  }

  // Variant Option Buttons
  for (let i = 0; i < optionButtons.length; i++) {
    optionButtons[i].addEventListener('click', function (event) {
      for (let j = 0; j < optionButtons.length; j++) {
        optionButtons[j].classList.remove('active');
      }
      this.classList.add('active');

      const clickedOption = this.getAttribute('data-option');
      window.ur_selected_variant_option = clickedOption;
      setVariantOption(clickedOption);
      calculateTotal();
    });
  }

  function setVariantOption(clickedOption) {
    // Scope products to the main selection area to avoid affecting modals
    const products = document.querySelectorAll('.main-collection-select .ur-product:not(.additive)');
    for (let k = 0; k < products.length; k++) {
      const product = products[k];
      const variants = product.getElementsByClassName('ur-variant');
      let highestQuantity = 0;
      for (let l = 0; l < variants.length; l++) {
        const variant = variants[l];
        const quantityInput = variant.querySelector('.variant-quantity');
        if (quantityInput) {
          const quantityValue = parseInt(quantityInput.value, 10);
          if (!isNaN(quantityValue) && quantityValue > highestQuantity) {
            highestQuantity = quantityValue;
          }
        }
      }

      for (let l = 0; l < variants.length; l++) {
        const variant = variants[l];
        const quantityElement = variant.querySelector('.variant-quantity');
        if (variant.getAttribute('data-option') === clickedOption) {
          variant.classList.remove('xhidden');
          if (quantityElement) {
            quantityElement.value = highestQuantity;
          }
        } else {
          variant.classList.add('xhidden');
          if (quantityElement) {
            quantityElement.value = 0;
          }
        }
      }
    }
  }

  //Input listener
  document
    .querySelector('#add-box-to-cart-form')
    .addEventListener('input', function (event) {
      if (event.target.matches('input, select, textarea')) {
        calculateTotal();
      }
    });

  const swiperConfig = {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 1,
    initialSlide: 2,
    spaceBetween: -50,
    loop: true,
    loopAdditionalSlides: 6,
    coverflowEffect: {
      rotate: 0,
      stretch: 280,
      depth: 700,
      modifier: 1.8,
      slideShadows: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  //Swiper Init
  const swiper = new Swiper('.ur-bab-swiper', swiperConfig);

  const productElements = document.querySelectorAll('.ur-product');
  productElements.forEach((product) => {
    product.addEventListener('click', function () {
      const productIndex =
        parseInt(product.getAttribute('data-product-index')) - 1;
      swiper.slideToLoop(productIndex, 400, true);
    });
  });

  //Footer
  function getOffset(el) {
    const rect = el.getBoundingClientRect();
    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;
    return { top, left };
  }

  // Get the element
  const footer = document.querySelector('.ur-form-footer');

  if (footer) {
    const position = getOffset(footer);
    // Now, position the footer as absolute
    footer.style.bottom = '0';
    footer.style.left = position.left + 'px';
    footer.style.position = 'sticky';
  }

  checkForRecommendation();

  // Add this new cookies modal handler before the existing handle400gModal code
  const handleCookiesModal = (() => {
    const modal = document.getElementById('ur-cookies-modal');
    if (!modal) return;

    const modalCloseBtn = modal.querySelector('.modal-close-btn');
    const modalApplyBtn = modal.querySelector('.modal-apply-btn');
    let remainingSelections = 0;
    
    // Add counter element after the modal title
    const counterDiv = document.createElement('div');
    counterDiv.className = 'xtext-lg xmb-4 xfont-bold';
    modal.querySelector('h2').after(counterDiv);
    
    function updateCounter() {
      const currentTotal = Array.from(modal.querySelectorAll('.cookies-modal-variant-quantity'))
        .reduce((sum, input) => sum + parseInt(input.value || 0), 0);
      const remaining = remainingSelections - currentTotal;
      
      counterDiv.textContent = `Noch ${remaining} von ${remainingSelections} Packungen verfügbar`;
      
      // Disable/enable increment buttons based on remaining cookies
      modal.querySelectorAll('.cookies-modal-quantity-btn[data-action="increment"]').forEach(btn => {
        if (remaining <= 0) {
          btn.disabled = true;
          btn.classList.add('xopacity-50', 'xcursor-not-allowed');
        } else {
          btn.disabled = false;
          btn.classList.remove('xopacity-50', 'xcursor-not-allowed');
        }
      });
    }
    
    function openModal(freeCookiesCount) {
      remainingSelections = freeCookiesCount;
      
      // Reset all quantities to 0
      modal.querySelectorAll('.cookies-modal-variant-quantity').forEach(input => {
        input.value = 0;
      });
      
      updateCounter();
      modal.classList.remove('xhidden');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.add('xhidden');
      document.body.style.overflow = '';
    }

    function handleQuantityChange(e) {
      // const btn = e.target;
      // const input = btn.closest('.custom-number-input').querySelector('.cookies-modal-variant-quantity');
      // const currentValue = parseInt(input.value || 0);
      
      // if (btn.dataset.action === 'increment' && !btn.disabled) {
      //   input.value = currentValue + 1;
      // } else if (btn.dataset.action === 'decrement' && currentValue > 0) {
      //   input.value = currentValue - 1;
      // }
      
      updateCounter();
    }

    // Event Listeners
    modalCloseBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll('.cookies-modal-quantity-btn').forEach(btn => {
      btn.addEventListener('click', handleQuantityChange);
    });

    // Also handle direct input changes
    modal.querySelectorAll('.cookies-modal-variant-quantity').forEach(input => {
      input.addEventListener('change', () => {
        const currentTotal = Array.from(modal.querySelectorAll('.cookies-modal-variant-quantity'))
          .reduce((sum, input) => sum + parseInt(input.value || 0), 0);
        
        if (currentTotal > remainingSelections) {
          input.value = Math.max(0, parseInt(input.value) - (currentTotal - remainingSelections));
        }
        
        updateCounter();
      });
    });

    modalApplyBtn.addEventListener('click', () => {
      console.log('apply btn clicked');
      const selectedVariants = [];
      
      modal.querySelectorAll('.product-item').forEach(product => {
        const quantity = parseInt(product.querySelector('.cookies-modal-variant-quantity').value || 0);
        if (quantity > 0) {
          const variantId = product.querySelector('.variant-id').value;
          selectedVariants.push({
            variantId: variantId,
            quantity: quantity,
            isCookie: true  // Add this flag to identify cookie items
          });
          cookies200gFreeCountAvailable = cookies200gFreeCountAvailable - quantity;
        }
      });
      
      additionalItems = [...additionalItems, ...selectedVariants];
      handleAddToCart();
      closeModal();
    });

    return { openModal };
  })();

  // Free 400g Modal Handler
  const handle400gModal = (() => {
    const modal = document.getElementById('ur-400g-modal');
    if (!modal) return;

    const modalCloseBtn = modal.querySelector('.modal-close-btn');
    const modalApplyBtn = modal.querySelector('.modal-apply-btn');
    let remainingSelections = 0;
    
    // Add counter element after the modal title
    const counterDiv = document.createElement('div');
    counterDiv.className = 'xtext-lg xmb-4 xfont-bold';
    modal.querySelector('h2').after(counterDiv);
    
    function updateCounter() {
      const currentTotal = Array.from(modal.querySelectorAll('.modal-variant-quantity'))
        .reduce((sum, input) => sum + parseInt(input.value || 0), 0);
      const remaining = remainingSelections - currentTotal;
      
      counterDiv.textContent = `Noch ${remaining} von ${remainingSelections} Dosen verfügbar`;
      
      // Disable/enable increment buttons based on remaining cans
      modal.querySelectorAll('.modal-quantity-btn[data-action="increment"]').forEach(btn => {
        if (remaining <= 0) {
          btn.disabled = true;
        } else {
          btn.disabled = false;
        }
      });
    }

    
    function openModal(freeCansCount) {
      remainingSelections = freeCansCount;
      
      // Reset all quantities to 0
      modal.querySelectorAll('.modal-variant-quantity').forEach(input => {
        input.value = 0;
      });

      // Ensure all 400g variants within this modal are visible
      modal.querySelectorAll('.variant.ur-variant').forEach(variantElement => {
        variantElement.classList.remove('xhidden');
      });
      
      updateCounter();
      modal.classList.remove('xhidden');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.add('xhidden');
      document.body.style.overflow = '';
    }

    function handleQuantityChange(e) {
      // console.log("handleQuantityChange");
      // console.log(e);
      // const btn = e.target;
      // const input = btn.closest('.custom-number-input').querySelector('.modal-variant-quantity');
      // // if (btn.dataset.action === 'increment' && !btn.disabled) {
      // //   input.value = parseInt(input.value) + 1;
      // // } else if (btn.dataset.action === 'decrement' && parseInt(input.value) > 0) {
      // //   input.value = parseInt(input.value) - 1;
      // // }
      
      updateCounter();
    }

    // Event Listeners
    modalCloseBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll('.modal-quantity-btn').forEach(btn => {
      btn.addEventListener('click', handleQuantityChange);
    });

    // Also handle direct input changes
    modal.querySelectorAll('.modal-variant-quantity').forEach(input => {
      input.addEventListener('change', () => {
        const currentTotal = Array.from(modal.querySelectorAll('.modal-variant-quantity'))
          .reduce((sum, input) => sum + parseInt(input.value || 0), 0);
        
        if (currentTotal > remainingSelections) {
          input.value = Math.max(0, parseInt(input.value) - (currentTotal - remainingSelections));
        }
        
        updateCounter();
      });
    });

    modalApplyBtn.addEventListener('click', () => {
      const selectedVariants = [];
      modal.querySelectorAll('.ur-variant').forEach(variant => {
        const quantityInput = variant.querySelector('.modal-variant-quantity');
        const variantIdInput = variant.querySelector('.variant-id');

        if (quantityInput && variantIdInput) {
            const quantity = parseInt(quantityInput.value || 0);
            if (quantity > 0) {
              selectedVariants.push({
                variantId: variantIdInput.value,
                quantity: quantity
              });
              can400gFreeCountAvailable -= quantity; // Update the available count
            }
        }
      });
      
      additionalItems = [...additionalItems, ...selectedVariants];
      
      closeModal(); // Close the 400g modal
      handleAddToCart(); // Call main handler to decide next step (cookies modal or add to cart)
    });

    return { openModal };
  })();


});
