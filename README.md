#  Welcome everyone !

`$ echo "I'm Arpy"  >>  README.md`
<hr>

```java
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@Slf4j
class ProfileTest {

	@Test
	void runFullStackInfo() {
		String role = "Full-Stack Developer";
		List<String> frontend = List.of("HTML", "CSS", "JavaScript");
		List<String> backend = List.of("Java", "SQL", "JSON");
		String systems = "Windows & Linux";
		
		Profile profile = new Profile(role, frontend, backend, systems);
		
		log.info(role);
		log.info(frontend.toString());
		log.info(backend.toString());
		log.info(systems);
		
		assertEquals(role, profile.getRole());
		assertEquals(frontend, profile.getFrontendSkills());
		assertEquals(backend, profile.getBackendSkills());
		assertEquals(systems, profile.getSystems());
	}
}
```









