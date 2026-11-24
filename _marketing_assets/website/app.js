const AGES_DATA = [
  {
    index: 0,
    tag: 'Age I · Royal Vanguard',
    title: 'Stone & Reed · 石与芦苇',
    castle: 'Stone Bastion（石垒城塞）',
    evolveCost: '45 Coins → Age II',
    stages: 'Ch.1 · Willow Brook / Mossy Ford / Redstone Gate',
    image: '../raw_assets/cgs/victory_banner_dawn.jpg',
    caption: '晨曦柳溪谷道，蓝金面甲誓刃骑士守护着第一座象牙石堡。',
    units: [
      { role: 'Melee · 近战', name: 'Oathblade 誓刃骑士', cost: '8 Food', stats: '165 HP · 20 DMG · 4-Target Cleave', rival: 'Clubkin' },
      { role: 'Ranged · 远程', name: 'Royal Longbow 皇家穿云弓', cost: '12 Food', stats: '110 HP · 22 DMG · 3-Target Pierce', rival: 'Slinger' },
      { role: 'Colossus · 巨像', name: 'Brass Automaton 黄铜巨像', cost: '42 Food', stats: '720 HP · 56 DMG · 7-Target Slam', rival: 'Iron Walker' },
    ],
  },
  {
    index: 1,
    tag: 'Age II · Gilded Order',
    title: 'Timber & Bronze · 青铜木垒',
    castle: 'Bronze Keep（青铜堡垒）',
    evolveCost: '95 Coins → Age III',
    stages: 'Ch.2 · Oakridge Camp / Copper Palisade / Bronze Citadel',
    image: '../raw_assets/cgs/victory_swarm_surge.jpg',
    caption: '青铜铸甲全面列装，皇家精锐军团以锐不可当之势突破敌方栅垒。',
    units: [
      { role: 'Melee · 近战', name: 'Aegis Knight 圣盾骑士', cost: '8 Food', stats: '255 HP · 31 DMG · 4-Target Cleave', rival: 'Shieldkin' },
      { role: 'Ranged · 远程', name: 'Gilded Marksman 镀金射手', cost: '12 Food', stats: '168 HP · 35 DMG · 4-Target Pierce', rival: 'Yew Archer' },
      { role: 'Colossus · 巨像', name: 'Gilded Colossus 鎏金巨像', cost: '42 Food', stats: '1120 HP · 88 DMG · 7-Target Slam', rival: 'Boiler Crusher' },
    ],
  },
  {
    index: 2,
    tag: 'Age III · High Citadel',
    title: 'Clockwork Guild · 齿轮行会',
    castle: 'Clockwork Citadel（发条高城）',
    evolveCost: '165 Coins → Age IV',
    stages: 'Ch.3 · Verdant Pass / Vial Crossing / Alchemist Spire',
    image: '../raw_assets/cgs/defeat_inches_short.jpg',
    caption: '精密发条与炼金攻城战爆发，游侠钢盔加装黄铜瞄具穿透重围。',
    units: [
      { role: 'Melee · 近战', name: 'Guild Paladin 行会圣骑士', cost: '8 Food', stats: '400 HP · 49 DMG · 5-Target Cleave', rival: 'Lancer' },
      { role: 'Ranged · 远程', name: 'Clockwork Arbalester 发条劲弩', cost: '12 Food', stats: '258 HP · 55 DMG · 4-Target Pierce', rival: 'Alchemist' },
      { role: 'Colossus · 巨像', name: 'Clockwork Titan 齿轮泰坦', cost: '42 Food', stats: '1740 HP · 138 DMG · 8-Target Slam', rival: 'Siege Dreadnought' },
    ],
  },
  {
    index: 3,
    tag: 'Age IV · Sovereign Watch',
    title: 'Brass & Steam · 黄铜蒸汽',
    castle: 'Steam Fortress（蒸汽要塞）',
    evolveCost: '260 Coins → Age V',
    stages: 'Ch.4 · Windmill Ridge / Copper Viaduct / Boiler Bastion',
    image: '../raw_assets/cgs/defeat_siege_eclipse.jpg',
    caption: '蒸汽炉火与钢铁巨像正面轰鸣，每一步重踏都激起战地尘烟。',
    units: [
      { role: 'Melee · 近战', name: 'Iron Banneret 铁旗战将', cost: '8 Food', stats: '615 HP · 76 DMG · 5-Target Cleave', rival: 'Dragoon' },
      { role: 'Ranged · 远程', name: 'Skyguard Fusilier 苍穹火枪手', cost: '12 Food', stats: '390 HP · 86 DMG · 5-Target Pierce', rival: 'Musketeer' },
      { role: 'Colossus · 巨像', name: 'Solar Mech 烈阳机甲', cost: '42 Food', stats: '2680 HP · 212 DMG · 8-Target Slam', rival: 'Furnace Titan' },
    ],
  },
  {
    index: 4,
    tag: 'Age V · Astral Crown',
    title: 'Starlight Kin · 星穹之民',
    castle: 'Astral Citadel（星穹圣城）',
    evolveCost: 'Max Age · Unlocks Infinite Timeline (TL 2+)',
    stages: 'Ch.5 · Lantern Meadow / Astral Causeway / Crown Observatory',
    image: '../raw_assets/cgs/victory_astral_crown.jpg',
    caption: '星光与天灯升腾在暮色尖塔之上，通往无限时间线（Timeline）的终极征程。',
    units: [
      { role: 'Melee · 近战', name: 'Sun Warden 烈日守望者', cost: '8 Food', stats: '940 HP · 118 DMG · 6-Target Cleave', rival: 'Sunblade' },
      { role: 'Ranged · 远程', name: 'Starlight Piercer 星辉穿刺者', cost: '12 Food', stats: '590 HP · 132 DMG · 5-Target Pierce', rival: 'Prism Bow' },
      { role: 'Colossus · 巨像', name: 'Astral Colossus 星穹巨像', cost: '42 Food', stats: '4100 HP · 325 DMG · 9-Target Slam', rival: 'Eclipse Walker' },
    ],
  },
];

const GALLERY_ITEMS = [
  { src: '../raw_assets/cgs/victory_banner_dawn.jpg', title: 'First Dawn · 破晓旌旗', sub: 'Victory CG I · Early Era Triumph' },
  { src: '../raw_assets/cgs/victory_swarm_surge.jpg', title: 'Tide of Vanguard · 铁骑破阵', sub: 'Victory CG II · 10+ Royal Elites Deployed' },
  { src: '../raw_assets/cgs/victory_astral_crown.jpg', title: 'Sovereign of the Spire · 星穹加冕', sub: 'Victory CG III · Chapters 4–5 / Age III+' },
  { src: '../raw_assets/cgs/defeat_rain_retreat.jpg', title: 'Rain Before Dawn · 孤灯雨撤', sub: 'Defeat CG I · Regroup Under Valley Rain' },
  { src: '../raw_assets/cgs/defeat_inches_short.jpg', title: 'One Stone Short · 功亏一篑', sub: 'Defeat CG II · Enemy Keep <= 35% HP' },
  { src: '../raw_assets/cgs/defeat_siege_eclipse.jpg', title: 'Bell of Defiance · 暗日战鼓', sub: 'Defeat CG III · Prolonged Colossus Siege' },
];

function renderAge(idx) {
  const age = AGES_DATA[idx] || AGES_DATA[0];
  document.querySelectorAll('.age-tab').forEach((btn, i) => {
    btn.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });

  const artImg = document.getElementById('chronicle-img');
  const artCap = document.getElementById('chronicle-caption');
  const metaEl = document.getElementById('chronicle-meta');
  const titleEl = document.getElementById('chronicle-title');
  const stageEl = document.getElementById('chronicle-stages');
  const tbody = document.getElementById('chronicle-units-body');

  if (artImg) {
    artImg.src = age.image;
    artImg.alt = age.title;
  }
  if (artCap) artCap.textContent = age.caption;
  if (metaEl) metaEl.textContent = `${age.tag} · ${age.castle} · ${age.evolveCost}`;
  if (titleEl) titleEl.textContent = age.title;
  if (stageEl) stageEl.textContent = age.stages;
  if (tbody) {
    tbody.innerHTML = age.units
      .map(
        (u) => `
        <tr>
          <td>
            <span class="unit-role-name">${u.name}</span>
            <span class="unit-role-sub">${u.role}</span>
          </td>
          <td class="font-mono-num">${u.cost}</td>
          <td class="font-mono-num">${u.stats}</td>
          <td>${u.rival}</td>
        </tr>`
      )
      .join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. 5-Age Interactive Tabs
  document.querySelectorAll('.age-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderAge(Number(btn.dataset.age || 0));
    });
  });
  renderAge(0);

  // 2. Trailer Switcher
  const videoEl = document.getElementById('trailer-player');
  document.querySelectorAll('.trailer-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trailer-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      if (videoEl && btn.dataset.src) {
        videoEl.src = btn.dataset.src;
        if (btn.dataset.poster) videoEl.poster = btn.dataset.poster;
        videoEl.load();
      }
    });
  });

  // 3. Lightbox for Chronicle CG Gallery
  const galleryGrid = document.getElementById('cg-gallery-grid');
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxSub = document.getElementById('lightbox-sub');

  if (galleryGrid) {
    galleryGrid.innerHTML = GALLERY_ITEMS.map(
      (item, idx) => `
      <button type="button" class="gallery-item" data-cg-idx="${idx}">
        <img src="${item.src}" alt="${item.title}" loading="lazy" />
        <div class="gallery-item-meta">
          <span class="gallery-item-title">${item.title}</span>
          <span class="gallery-item-sub">${item.sub}</span>
        </div>
      </button>`
    ).join('');

    galleryGrid.querySelectorAll('.gallery-item').forEach((card) => {
      card.addEventListener('click', () => {
        const item = GALLERY_ITEMS[Number(card.dataset.cgIdx || 0)];
        if (!item || !lightbox) return;
        lightboxImg.src = item.src;
        lightboxImg.alt = item.title;
        lightboxTitle.textContent = item.title;
        lightboxSub.textContent = item.sub;
        lightbox.classList.add('open');
      });
    });
  }

  // 4. Privacy Modal & Escape close
  const privacyModal = document.getElementById('privacy-modal');
  const openPrivacy = () => privacyModal && privacyModal.classList.add('open');
  document.querySelectorAll('[data-open-privacy]').forEach((el) => el.addEventListener('click', openPrivacy));

  if (window.location.hash === '#privacy') openPrivacy();

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lightbox && lightbox.classList.remove('open');
      privacyModal && privacyModal.classList.remove('open');
    });
  });

  [lightbox, privacyModal].forEach((backdrop) => {
    backdrop &&
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lightbox && lightbox.classList.remove('open');
      privacyModal && privacyModal.classList.remove('open');
    }
  });

  // 5. Support Form Validation
  const form = document.getElementById('support-form');
  const feedback = document.getElementById('support-feedback');
  if (form && feedback) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (document.getElementById('support-email')?.value || '').trim();
      const msg = (document.getElementById('support-message')?.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback.textContent = 'Please enter a valid email address so our team can reply.';
        feedback.className = 'form-feedback error';
        return;
      }
      if (msg.length < 8) {
        feedback.textContent = 'Please describe your issue or feedback in at least 8 characters.';
        feedback.className = 'form-feedback error';
        return;
      }
      feedback.textContent =
        'Thank you! Your inquiry is ready — we also respond within 48 hours at support@1add2gamestudio.com.';
      feedback.className = 'form-feedback';
      form.reset();
    });
  }
});
