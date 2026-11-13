export interface RegionGroup {
  sido: string;
  shortName: string;
  sigunguList: string[];
}

export const KOREA_REGIONS: RegionGroup[] = [
  {
    sido: '서울특별시',
    shortName: '서울',
    sigunguList: [
      '서울특별시 전체',
      '강남구',
      '강동구',
      '강북구',
      '강서구',
      '관악구',
      '광진구',
      '구로구',
      '금천구',
      '노원구',
      '도봉구',
      '동대문구',
      '동작구',
      '마포구',
      '서대문구',
      '서초구',
      '성동구',
      '성북구',
      '송파구',
      '양천구',
      '영등포구',
      '용산구',
      '은평구',
      '종로구',
      '중구',
      '중랑구',
    ],
  },
  {
    sido: '경기도',
    shortName: '경기',
    sigunguList: [
      '경기도 전체',
      '수원시',
      '성남시',
      '고양시',
      '용인시',
      '부천시',
      '안산시',
      '안양시',
      '남양주시',
      '화성시',
      '평택시',
      '의정부시',
      '시흥시',
      '파주시',
      '김포시',
      '광명시',
      '광주시',
      '군포시',
      '오산시',
      '이천시',
      '안성시',
      '하남시',
      '양주시',
      '구리시',
      '포천시',
      '의왕시',
      '여주시',
      '양평군',
      '과천시',
    ],
  },
  {
    sido: '인천광역시',
    shortName: '인천',
    sigunguList: [
      '인천광역시 전체',
      '계양구',
      '남동구',
      '동구',
      '미추홀구',
      '부평구',
      '서구',
      '연수구',
      '중구',
      '강화군',
      '옹진군',
    ],
  },
  {
    sido: '충청남도',
    shortName: '충남',
    sigunguList: [
      '충청남도 전체',
      '천안시',
      '아산시',
      '공주시',
      '보령시',
      '서산시',
      '논산시',
      '계룡시',
      '당진시',
      '금산군',
      '부여군',
      '서천군',
      '청양군',
      '홍성군',
      '예산군',
      '태안군',
    ],
  },
  {
    sido: '충청북도',
    shortName: '충북',
    sigunguList: [
      '충청북도 전체',
      '청주시',
      '충주시',
      '제천시',
      '보은군',
      '옥천군',
      '영동군',
      '증평군',
      '진천군',
      '괴산군',
      '음성군',
      '단양군',
    ],
  },
  {
    sido: '대전광역시',
    shortName: '대전',
    sigunguList: ['대전광역시 전체', '대덕구', '동구', '서구', '유성구', '중구'],
  },
  {
    sido: '세종특별자치시',
    shortName: '세종',
    sigunguList: ['세종특별자치시 전체'],
  },
  {
    sido: '강원특별자치도',
    shortName: '강원',
    sigunguList: [
      '강원특별자치도 전체',
      '춘천시',
      '원주시',
      '강릉시',
      '동해시',
      '태백시',
      '속초시',
      '삼척시',
      '홍천군',
      '횡성군',
      '평창군',
    ],
  },
  {
    sido: '부산광역시',
    shortName: '부산',
    sigunguList: [
      '부산광역시 전체',
      '강서구',
      '금정구',
      '남구',
      '동구',
      '동래구',
      '부산진구',
      '북구',
      '사상구',
      '사하구',
      '서구',
      '수영구',
      '연제구',
      '영도구',
      '중구',
      '해운대구',
      '기장군',
    ],
  },
  {
    sido: '대구광역시',
    shortName: '대구',
    sigunguList: [
      '대구광역시 전체',
      '남구',
      '달서구',
      '동구',
      '북구',
      '서구',
      '수성구',
      '중구',
      '달성군',
      '군위군',
    ],
  },
  {
    sido: '울산광역시',
    shortName: '울산',
    sigunguList: ['울산광역시 전체', '남구', '동구', '북구', '중구', '울주군'],
  },
  {
    sido: '광주광역시',
    shortName: '광주',
    sigunguList: ['광주광역시 전체', '광산구', '남구', '동구', '북구', '서구'],
  },
  {
    sido: '전북특별자치도',
    shortName: '전북',
    sigunguList: [
      '전북특별자치도 전체',
      '전주시',
      '군산시',
      '익산시',
      '정읍시',
      '남원시',
      '김제시',
      '완주군',
    ],
  },
  {
    sido: '전라남도',
    shortName: '전남',
    sigunguList: [
      '전라남도 전체',
      '목포시',
      '여수시',
      '순천시',
      '나주시',
      '광양시',
      '무안군',
      '담양군',
    ],
  },
  {
    sido: '경상북도',
    shortName: '경북',
    sigunguList: [
      '경상북도 전체',
      '포항시',
      '경주시',
      '김천시',
      '안동시',
      '구미시',
      '영주시',
      '경산시',
      '칠곡군',
    ],
  },
  {
    sido: '경상남도',
    shortName: '경남',
    sigunguList: [
      '경상남도 전체',
      '창원시',
      '진주시',
      '통영시',
      '사천시',
      '김해시',
      '밀양시',
      '거제시',
      '양산시',
    ],
  },
  {
    sido: '제주특별자치도',
    shortName: '제주',
    sigunguList: ['제주특별자치도 전체', '제주시', '서귀포시'],
  },
];

export function formatSelectedRegion(sido: string, sigungu: string): string {
  if (!sigungu || sigungu.endsWith('전체')) {
    return sido;
  }
  return `${sido} ${sigungu}`;
}

export function findRegionPair(value: string): { sido: string; sigungu: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { sido: '충청남도', sigungu: '천안시' };
  }
  for (const group of KOREA_REGIONS) {
    if (trimmed === group.sido || trimmed === group.shortName) {
      return { sido: group.sido, sigungu: `${group.sido} 전체` };
    }
    if (trimmed.startsWith(`${group.sido} `)) {
      const rest = trimmed.slice(group.sido.length + 1).trim();
      const matched = group.sigunguList.find((item) => item === rest);
      return {
        sido: group.sido,
        sigungu: matched ?? `${group.sido} 전체`,
      };
    }
    const directCity = group.sigunguList.find((item) => item === trimmed);
    if (directCity) {
      return { sido: group.sido, sigungu: directCity };
    }
  }
  return { sido: '경기도', sigungu: '경기도 전체' };
}
