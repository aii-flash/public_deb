// ===============================================
// 메인 JavaScript 파일 (V4. 완전체) - 수정본
// 역할:
// 1. 외부 오디오 에셋 자동 로드 및 초기화
// 2. 범용 인터페이스 함수 제공 (사운드 재생, 텍스트 확장)
// ===============================================

// << 전역 객체 초기화 >>
// -----------------------------------------------



// << 오디오 시스템 자동 로딩 >>
// -----------------------------------------------

// 1. 오디오 에셋 '목록'을 먼저 불러옵니다.
$.getScript("scripts/assetList.js") // 일단 로더부터 실행!
    .done(function() { // 로딩이 성공한 후에야,
        setup.sfx = {}; // <--- 안전한 이곳으로 '이사'옴.
        setup.sfx.isReady = false;
        console.log("오디오 목록 로드 성공. 개별 에셋 로딩을 시작합니다.");
        loadAllAudioAssets();
    })
    .fail(function() {
        console.error("치명적 오류: 'assetList.js' 파일을 찾을 수 없습니다. 경로를 확인하세요.");
    });


/**
 * 목록에 있는 모든 오디오 에셋 스크립트를 순차적으로 로딩하는 함수
 */
function loadAllAudioAssets() {
    // window.lifeGameAudioData.assetList가 존재하는지 확인
    // (중요: 에셋 파일에서도 'lifeGameAudioData' 객체를 사용해야 합니다!)
    if (!window.lifeGameAudioData || !Array.isArray(window.lifeGameAudioData.assetList)) {
        console.error("'assetList.js'에서 'window.lifeGameAudioData.assetList' 배열을 찾을 수 없습니다.");
        return;
    }
    const loadingPromises = window.lifeGameAudioData.assetList.map(assetPath => {
        return $.getScript(assetPath)
            .done(() => console.log(`에셋 로드: ${assetPath}`))
            .fail(() => console.error(`에셋 로드 실패: ${assetPath}`));
    });

    // 모든 에셋 파일 로딩이 끝나기를 기다립니다.
    Promise.all(loadingPromises)
        .then(() => {
            console.log("모든 에셋 파일의 로딩 시도 완료. 사운드 시스템을 구축합니다.");
            initializeSoundSystem();
        });
}


/**
 * 로드된 모든 데이터로 실제 사운드 시스템을 구축하는 최종 함수
 */
function initializeSoundSystem() {
    const audioData = window.lifeGameAudioData;
    const audioKeys = Object.keys(audioData).filter(key => key !== 'assetList');
    
    if (audioKeys.length === 0) {
        console.warn("로딩된 오디오 데이터가 없습니다. (에셋 파일의 전역 객체 이름이 'window.lifeGameAudioData'가 맞는지 확인하세요)");
        finishInitialization(); // 데이터가 없어도 초기화 완료 신호는 보냅니다.
        return;
    }
    
    let loadedCount = 0;
    audioKeys.forEach(key => {
        const audio = new Audio(audioData[key]);
        
        audio.oncanplaythrough = function() {
            setup.sfx[key] = audio;
            setup.sfx[key].volume = 0.5;
            loadedCount++;
            console.log(`사운드 준비 완료: ${key} (${loadedCount}/${audioKeys.length})`);
            if (loadedCount === audioKeys.length) finishInitialization();
        };

        audio.onerror = function() {
            console.error(`사운드 데이터 오류 또는 로딩 실패: ${key}`);
            loadedCount++;
            if (loadedCount === audioKeys.length) finishInitialization();
        };
    });
}

/**
 * 초기화 완료 후 마무리 작업을 처리하는 헬퍼 함수
 */
function finishInitialization() {
    if (!setup.sfx.isReady) { // 중복 실행 방지
        console.log("★★★★★ 사운드 시스템 초기화 완료! ★★★★★");
        setup.sfx.isReady = true;

        if (setup.sfx.click) { 
            setup.sfx.default = setup.sfx.click;
        }

        $.event.trigger(':sfxready');
    }
}


// << 범용 인터페이스 함수 >>
// -----------------------------------------------

/**
 * 모든 소리를 담당하는 공용 함수 (음량 조절 및 디버깅 메시지 추가 버전)
 */
window.playInterfaceSound = function(element) {
    if (!setup.sfx || !setup.sfx.isReady) {
        console.warn("사운드 시스템 미준비 상태. 재생 건너뜀.");
        return;
    }

    const $element = $(element);
    const sfx = setup.sfx || {};
  
    // 기본 효과음이 없을 때의 방어 코드
    if (!sfx.default) {
      console.warn("음향 시스템: 기본 효과음(setup.sfx.default)이 준비되지 않았습니다.");
      return;
    }
  
    const customSfxPath = $element.data('sfx');
    const presetSfxKey = $element.data('sfx-preset');
    const customVolume = $element.data('sfx-volume');
  
    console.log("음향 시스템: 클릭 감지!", { 
      element: $element[0], 
      sfx: customSfxPath, 
      preset: presetSfxKey, 
      volume: customVolume 
    });
  
    if (customSfxPath) {
      const customSound = new Audio(customSfxPath);
      customSound.volume = (customVolume !== undefined) ? parseFloat(customVolume) : sfx.default.volume;
      console.log(">> 일회성 사운드 재생. 적용된 볼륨:", customSound.volume);
      customSound.play();
    } 
    else if (presetSfxKey && sfx[presetSfxKey]) {
      const sound = sfx[presetSfxKey];
      const originalVolume = sound.volume;

      if (customVolume !== undefined) {
        sound.volume = parseFloat(customVolume);
        console.log(">> 프리셋 사운드 재생. 임시 적용된 볼륨:", sound.volume);
      } else {
        console.log(">> 프리셋 사운드 재생. 기본 볼륨:", sound.volume);
      }

      sound.currentTime = 0;
      sound.play();

      if (customVolume !== undefined) {
        sound.onended = function() {
          sound.volume = originalVolume; // 원래 볼륨으로 복구
          sound.onended = null;
        };
      }
    } 
    else {
      console.log(">> 기본 사운드 재생. 볼륨:", sfx.default.volume);
      sfx.default.currentTime = 0;
      sfx.default.play();
    }
}


/**
 * '더보기' 링크를 위한 함수
 */
window.revealExtraText = function(linkElement) {
    const $link = $(linkElement);
    const $wrapper = $link.closest('.reveal-wrapper');
    const $revealText = $wrapper.children('.reveal-text');
    
    if ($revealText.is(':visible')) { return; }

    // '더보기' 링크 클릭 시에도 효과음이 나도록 playInterfaceSound를 호출합니다.
    if (typeof playInterfaceSound === 'function') {
        playInterfaceSound($link);
    }
    
    $revealText.slideDown();
    $link.contents().unwrap();
}


// << 범용 클릭 리스너 >>
// -----------------------------------------------

// 사운드 시스템이 완전히 준비된 후에만 클릭 리스너를 활성화합니다.
$(document).on(':sfxready', function () {
    console.log("클릭 리스너 활성화: 이제부터 적절한 클릭은 소리를 낼 수 있습니다.");

    // [수정됨] 클릭 리스너는 항상 등록합니다.
    // 클릭 이벤트가 '발생했을 때' 자동 재생 여부를 검사하도록 로직을 내부로 옮겼습니다.
    $('body').on('click.sfx', function(event) { // .sfx 네임스페이스 추가로 관리 용이

      // [수정됨] 이 로직을 이벤트 핸들러 안으로 가져왔습니다.
      // 이제 passage가 바뀌어 $applySfxToAllButtons 값이 바뀌어도 즉시 반영됩니다.
      if (State.variables.applySfxToAllButtons !== true) {
        // 자동 재생 기능이 꺼져있으면 아무것도 하지 않고 조용히 종료합니다.
        return;
      }
        
      const $target = $(event.target);
      // 더보기 링크의 상위 래퍼는 제외합니다. (revealExtraText 함수가 직접 소리를 제어)
      const $button = $target.closest('button, a.link-internal');

      if (!$button.length || $target.closest('.reveal-wrapper').length || $button.is('[disabled]')) {
        return;
      }

      playInterfaceSound($button);
    });
});