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
      if (variant.compare_at_price) {
        itemPriceOriginal = variant.compare_at_price;
      }
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
        if (promo.couponType === 'percent_discount' && promo.percentDiscount) {
          totalPrice = totalPrice - (totalPrice * (promo.percentDiscount / 100));
        } else if (promo.couponType === '400g_can_free') {
          can400gFreeCount++;
          can400gFreeCountAvailable++;
        } else if (promo.couponType === '200g_cookies_free') {
          cookies200gFreeCount++;
          cookies200gFreeCountAvailable++;
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

    document.querySelector('.free-400g-can-count').innerHTML = can400gFreeCount;
    document.querySelector('.free-200g-cookies-count').innerHTML = cookies200gFreeCount;
  }


  //Send Cart Form
  document
    .getElementById('add-box-to-cart-form')
    .addEventListener('submit', function (event) {
      event.preventDefault();
      handleAddToCart();
      
    });

  function handleAddToCart() {
    itemsToAdd = getVariantItems();

    const data = {
      items: itemsToAdd,
    };

    console.log(data);
    if(can400gFreeCountAvailable > 0) {
      handle400gModal.openModal(can400gFreeCountAvailable);
      return;
    }

    if(cookies200gFreeCountAvailable > 0) {
      //TODO: Open 200g cookies modal
    }
    console.log(data);
    if(additionalItems.length > 0) {
      for(let i = 0; i < additionalItems.length; i++) {
        data.items.push({
          id: additionalItems[i].variantId,
          quantity: additionalItems[i].quantity,
          selling_plan: '',
          collection: '',
        });
      }
    }
    console.log(data);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          console.log(response)
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        window.location.href = '/cart';
      })
      .catch((error) => {
        console.error(
          'There has been a problem with your fetch operation: ',
          error,
        );
      });
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
    const products = document.querySelectorAll('.ur-product:not(.additive)');
    for (let k = 0; k < products.length; k++) {
      const product = products[k];
      const variants = product.getElementsByClassName('ur-variant');
      console.log(product)
      let highestQuantity = 0;
      for (let l = 0; l < variants.length; l++) {
        const variant = variants[l];
        const quantity = variant.querySelector('.variant-quantity').value;
        if (quantity > highestQuantity) {
          highestQuantity = quantity;
        }
      }

      for (let l = 0; l < variants.length; l++) {
        const variant = variants[l];
        const quantityElement = variant.querySelector('.variant-quantity');
        console.log(variant.getAttribute('data-option'));
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
          btn.classList.add('xopacity-50', 'xcursor-not-allowed');
        } else {
          btn.disabled = false;
          btn.classList.remove('xopacity-50', 'xcursor-not-allowed');
        }
      });
    }
    
    function openModal(freeCansCount) {
      remainingSelections = freeCansCount;
      
      // Reset all quantities to 0
      modal.querySelectorAll('.modal-variant-quantity').forEach(input => {
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
      const btn = e.target;
      const input = btn.closest('.custom-number-input').querySelector('.modal-variant-quantity');
      const currentValue = parseInt(input.value || 0);
      
      if (btn.dataset.action === 'increment' && !btn.disabled) {
        input.value = currentValue + 1;
      } else if (btn.dataset.action === 'decrement' && currentValue > 0) {
        input.value = currentValue - 1;
      }
      
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
        const quantity = parseInt(variant.querySelector('.modal-variant-quantity').value || 0);
        if (quantity > 0) {
          selectedVariants.push({
            variantId: variant.querySelector('.variant-id').value,
            quantity: quantity
          });
          can400gFreeCountAvailable = can400gFreeCountAvailable - quantity;
        }
      });
      
      additionalItems = selectedVariants;

      handleAddToCart();
    });

    return { openModal };
  })();


});
