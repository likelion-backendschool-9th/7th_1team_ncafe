import java.util.Arrays;
import java.util.stream.IntStream;

public class App {
    public static void main(String[] args) {
        {
            Integer[] nums = {2,54,11,23,46,100,49};
            // Arrays.sort(nums, new Comparator<Integer>() {
            //     public int compare(Integer a, Integer b) {
            //         return b - a;
            //     }
            // });
            // Arrays.sort(nums, (Integer a, Integer b) -> { return b - a });
            Arrays.sort(nums, (Integer a, Integer b) -> b - a); // return과 중괄호는 뺄 수 있다
            
            String sorted = Arrays.toString(nums);
            System.out.println(sorted);
        }

        {
            String[] nums = {"2","54","11","23","46","100","49"};
            // Arrays.sort(nums, (String a, String b) -> b.compareTo(a)); // compareTo에서 앞에꺼는 앞에 뒤에꺼는 뒤에 가게 함
            // Method References
            Arrays.sort(nums, String::compareTo); // 그냥 메서드만 알려줌, 비교함수만 알려주면 인자 넘겨서 쓸게
            // 어떠한 메서드가 필요한지만 알려주면 그거 호출해서 해줄게
            // 클래스::비교할 함수

            String sorted = Arrays.toString(nums);
            System.out.println(sorted);
        }

        {
            int[] ages = {10,20,30,43,23,45,12,32,42};
            IntStream agesStream = IntStream.of(ages);

            int[] result = agesStream
                            // 필터링
                            .filter(age -> age>20)
                            // 정렬
                            // 매핑
                            // ...
                            .toArray();
            
            System.out.println(Arrays.toString(result));
        }
    }
}
